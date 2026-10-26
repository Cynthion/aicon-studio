import * as fs from 'node:fs';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import * as path from 'node:path';
import {
  describe,
  type Job,
  newJob,
  readSet,
  readStyles,
  redraw,
  REFERENCE_PROMPT,
  refill,
  setDir,
  sets,
  startRun,
  updateSet
} from './pipeline.ts';
import { isDrawn, readConfig, updateConfig, type Project } from './project.ts';
import { publicSettings, readSettings, type Settings, writeSettings } from './settings.ts';

// The studio server: a local page to compare icon sets, choose references, flip fill regions, edit subjects and styles, and
// start runs or redraws. It serves studio.html and a small JSON API over pipeline.ts, on the loopback interface only.
// Reference: .documentation/tech/pipeline.md.

const PAGE = new URL('./studio.html', import.meta.url);
const NAME = /^[\w-]+$/;
const INCOMPLETE = 'Enter the base URL, API key and models in Settings';

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const check = (ok: unknown, message: string, status = 400): void => {
  if (!ok) {
    throw new HttpError(status, message);
  }
};

const read = (file: string): string => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');

/** File name without `.svg` -> modification time, the cache key of each icon on the page. */
const versions = (dir: string): Record<string, number> =>
  fs.existsSync(dir)
    ? Object.fromEntries(
        fs
          .readdirSync(dir)
          .filter((file) => file.endsWith('.svg'))
          .map((file) => [file.slice(0, -4), Math.round(fs.statSync(path.join(dir, file)).mtimeMs)])
      )
    : {};

type Body = Record<string, unknown>;
type Route = [string, RegExp, (match: string[], body: Body) => unknown];

/** The studio server over a project: the page, its files and the JSON API. Not listening yet. */
export const createServer = (project: Project, settingsFile: string): http.Server => {
  let job: (Job & { kind: string; running: boolean; error?: string }) | undefined;

  const knownSet = (set: unknown): string => {
    check(typeof set === 'string' && sets(project).includes(set), `unknown set: ${String(set)}`);
    return set as string;
  };
  const busy = (): void => check(!job?.running, 'a drawing job is running, wait for it', 409);
  /** The column directory: the target as `icons`, or a set. */
  const columnDir = (col: unknown): string => (col === 'icons' ? project.target : setDir(project, knownSet(col)));
  /** The outline file of a drawn icon in the target, `icons`, or in a set. */
  const drawnOutline = (set: unknown, stem: unknown): string => {
    check(
      readConfig(project).icons.some((icon) => icon.stem === stem && isDrawn(icon)),
      `${String(stem)} is not a drawn icon`
    );
    const file = path.join(columnDir(set), `${String(stem)}.svg`);
    check(fs.existsSync(file), `${file} does not exist`);
    return file;
  };
  const settings = (model: 'imageModel' | 'describeModel'): Settings => {
    const stored = readSettings(settingsFile);
    check(stored.baseUrl && stored.apiKey && stored[model], INCOMPLETE);
    return stored;
  };

  /** Referenced stem -> the columns, `icons` or a set, whose outline is that reference. */
  const referencedIn = (stems: string[]): Record<string, string[]> =>
    Object.fromEntries(
      stems.map((stem) => [
        stem,
        ['icons', ...sets(project)].filter(
          (col) => read(path.join(columnDir(col), `${stem}.svg`)) === read(path.join(project.references, `${stem}.svg`))
        )
      ])
    );

  const state = (): object => {
    const config = readConfig(project);
    const references = versions(project.references);
    return {
      config,
      target: config.target,
      styles: readStyles(project),
      referencePrompt: REFERENCE_PROMPT,
      icons: versions(project.target),
      references,
      referencedIn: referencedIn(Object.keys(references)),
      sets: sets(project).map((set) => ({ set, info: readSet(project, set), files: versions(setDir(project, set)) })),
      settings: publicSettings(readSettings(settingsFile)),
      job
    };
  };

  /** Starts a drawing job in the background; the page follows it through `job` in the state. */
  const begin = (kind: string, work: (j: Job) => Promise<void>): void => {
    busy();
    const current = { ...newJob(), kind, running: true } as NonNullable<typeof job>;
    job = current;
    work(current)
      .catch((e: Error) => (current.error = e.message))
      .finally(() => (current.running = false));
  };

  const routes: Route[] = [
    ['GET', /^\/api\/state$/, () => state()],
    [
      'PUT',
      /^\/api\/styles\/([\w-]+)$/,
      ([name], { prompt }) => {
        check(typeof prompt === 'string' && prompt.includes('{subject}'), 'a style prompt needs {subject}');
        check((prompt as string).trim().startsWith('# '), 'a style prompt starts with a # heading');
        fs.mkdirSync(project.styles, { recursive: true });
        fs.writeFileSync(path.join(project.styles, `${name}.md`), `${(prompt as string).trim()}\n`);
      }
    ],
    [
      'DELETE',
      /^\/api\/styles\/([\w-]+)$/,
      ([name]) => {
        check(fs.existsSync(path.join(project.styles, `${name}.md`)), `unknown style: ${name}`);
        fs.rmSync(path.join(project.styles, `${name}.md`));
      }
    ],
    [
      'POST',
      /^\/api\/runs$/,
      (_, { styles, quality }) => {
        check(Array.isArray(styles) && styles.length, 'choose at least one style');
        const known = readStyles(project).map((style) => style.name);
        check(
          (styles as unknown[]).every((style) => known.includes(style as string)),
          'choose known styles'
        );
        check(['low', 'medium', 'high'].includes(quality as string), 'quality is low, medium or high');
        const stored = settings('imageModel');
        begin('run', (j) => startRun(project, stored, styles as string[], quality as string, j));
      }
    ],
    [
      'POST',
      /^\/api\/redraw$/,
      (_, { set, stems }) => {
        const known = knownSet(set);
        check(Array.isArray(stems) && stems.length, 'choose at least one icon');
        const stored = settings('imageModel');
        begin('redraw', (j) => redraw(project, stored, known, stems as string[], j));
      }
    ],
    [
      'PUT',
      /^\/api\/subjects\/([\w-]+)$/,
      ([stem], { subject }) => {
        check(
          readConfig(project).icons.some((icon) => icon.stem === stem && isDrawn(icon)),
          `${stem} is not a drawn icon`
        );
        check(typeof subject === 'string' && subject.trim(), 'a subject must not be empty');
        updateConfig(project, (config) => ({
          ...config,
          icons: config.icons.map((icon) =>
            icon.stem === stem ? { ...icon, subject: (subject as string).trim() } : icon
          )
        }));
      }
    ],
    [
      'PUT',
      /^\/api\/references\/([\w-]+)$/,
      ([stem], { set }) => {
        const from = drawnOutline(set, stem);
        fs.mkdirSync(project.references, { recursive: true });
        fs.copyFileSync(from, path.join(project.references, `${stem}.svg`));
      }
    ],
    [
      'DELETE',
      /^\/api\/references\/([\w-]+)$/,
      ([stem]) => {
        check(fs.existsSync(path.join(project.references, `${stem}.svg`)), `${stem} is not referenced`);
        fs.rmSync(path.join(project.references, `${stem}.svg`));
      }
    ],
    [
      'POST',
      /^\/api\/describe$/,
      async (_, { set, stem }) => {
        const file = drawnOutline(set, stem);
        const icon = readConfig(project)
          .icons.filter(isDrawn)
          .find((i) => i.stem === stem)!;
        return { subject: await describe(settings('describeModel'), file, icon.stem, icon.subject) };
      }
    ],
    [
      'PUT',
      /^\/api\/flips$/,
      async (_, { set, stem, points }) => {
        busy();
        const known = knownSet(set);
        check(
          readSet(project, known).icons.some((icon) => icon.stem === stem),
          `${String(stem)} is not drawn in ${known}`
        );
        check(
          Array.isArray(points) && points.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)),
          'points are [x, y] pairs'
        );
        updateSet(project, known, (info) => ({
          ...info,
          flips: { ...info.flips, [stem as string]: points as [number, number][] }
        }));
        await refill(project, known, [stem as string]);
      }
    ],
    [
      'DELETE',
      /^\/api\/sets\/([\w-]+)\/([\w-]+)$/,
      ([run, style]) => {
        busy();
        const set = knownSet(`${run}/${style}`);
        fs.rmSync(setDir(project, set), { recursive: true });
        if (!fs.readdirSync(path.join(project.runs, run)).length) {
          fs.rmdirSync(path.join(project.runs, run));
        }
      }
    ],
    [
      'POST',
      /^\/api\/adopt$/,
      (_, { set }) => {
        busy();
        const dir = setDir(project, knownSet(set));
        fs.mkdirSync(project.target, { recursive: true });
        for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.svg'))) {
          fs.copyFileSync(path.join(dir, file), path.join(project.target, file));
        }
      }
    ],
    [
      'PUT',
      /^\/api\/settings$/,
      (_, { baseUrl, apiKey, imageModel, describeModel, pricePlain, priceReferenced }) => {
        check(
          typeof baseUrl === 'string' && /^https?:\/\/\S+$/.test(baseUrl),
          'the base URL starts with http:// or https://'
        );
        check(typeof imageModel === 'string' && imageModel.trim(), 'an image model is needed');
        check(typeof describeModel === 'string' && describeModel.trim(), 'a describe model is needed');
        const price = (value: unknown, name: string): number | undefined => {
          if (value === undefined || value === null || value === '') {
            return undefined;
          }
          check(typeof value === 'number' && value >= 0, `${name} is a price`);
          return value as number;
        };
        const stored: Settings = {
          baseUrl: (baseUrl as string).replace(/\/+$/, ''),
          apiKey: typeof apiKey === 'string' && apiKey ? apiKey : readSettings(settingsFile).apiKey,
          imageModel: (imageModel as string).trim(),
          describeModel: (describeModel as string).trim()
        };
        const plain = price(pricePlain, 'pricePlain');
        const referenced = price(priceReferenced, 'priceReferenced');
        writeSettings(settingsFile, {
          ...stored,
          ...(plain === undefined ? {} : { pricePlain: plain }),
          ...(referenced === undefined ? {} : { priceReferenced: referenced })
        });
      }
    ]
  ];

  /** A file of the target, a set or the references, by `/files/icons/<f>`, `/files/sets/<run>/<style>/<f>` or `/files/references/<f>`. */
  const file = (url: string): string | undefined => {
    const parts = url.split('/').slice(2);
    if (!parts.every((p) => NAME.test(p.replace(/\.svg$/, ''))) || !parts.at(-1)?.endsWith('.svg')) {
      return undefined;
    }
    const [root, ...rest] = parts;
    const dir = { icons: project.target, sets: project.runs, references: project.references }[root];
    return dir ? path.join(dir, ...rest) : undefined;
  };

  const handle = async (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
    // icon URLs carry their file's mtime, so a changed file is a new URL
    const send = (status: number, type: string, body: string | Buffer, cache = 'no-cache'): void => {
      res.writeHead(status, { 'Content-Type': type, 'Cache-Control': cache });
      res.end(body);
    };
    try {
      // the guard: a page on any other origin, or a DNS name rebound to this address, gets nothing
      const { port } = server.address() as AddressInfo;
      const host = req.headers.host ?? '';
      check(host === `127.0.0.1:${port}` || host === `localhost:${port}`, `refused host ${host}`, 403);
      if (req.method !== 'GET') {
        const origin = req.headers.origin;
        check(origin === undefined || origin === `http://${host}`, `refused origin ${origin}`, 403);
        check(
          String(req.headers['content-type'] ?? '').startsWith('application/json'),
          'a write needs Content-Type: application/json',
          403
        );
      }
      const url = new URL(req.url ?? '/', `http://${host}`).pathname;
      if (req.method === 'GET' && url === '/') {
        return send(200, 'text/html; charset=utf-8', fs.readFileSync(PAGE));
      }
      if (req.method === 'GET' && url.startsWith('/files/')) {
        const svg = file(url);
        return svg && fs.existsSync(svg)
          ? send(200, 'image/svg+xml', fs.readFileSync(svg), 'max-age=31536000, immutable')
          : send(404, 'text/plain', 'not found');
      }
      const route = routes.find(([method, pattern]) => method === req.method && pattern.test(url));
      if (!route) {
        return send(404, 'application/json', JSON.stringify({ error: `no route ${req.method} ${url}` }));
      }
      let raw = '';
      for await (const chunk of req) {
        raw += chunk as string;
      }
      const body = (raw ? JSON.parse(raw) : {}) as Body;
      const result = await route[2](pattern(url, route[1]), body);
      send(200, 'application/json', JSON.stringify(result ?? { ok: true }));
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      send(status, 'application/json', JSON.stringify({ error: (e as Error).message }));
    }
  };
  const server = http.createServer((req, res) => {
    void handle(req, res);
  });
  return server;
};

const pattern = (url: string, regex: RegExp): string[] => regex.exec(url)!.slice(1);
