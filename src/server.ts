import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  describe,
  type Job,
  newJob,
  readSet,
  readStyles,
  redraw,
  REFERENCE_PROMPT,
  refill,
  rephrase,
  rephraseSubject,
  setDir,
  sets,
  startRun,
  updateSet,
  type Work,
  writeRotation
} from './pipeline.ts';
import {
  CONFIG_FILE,
  createProject,
  isDrawn,
  readConfig,
  resolveProject,
  updateConfig,
  type Project,
  type Rotated
} from './project.ts';
import { publicSettings, readSettings, type Settings, writeSettings } from './settings.ts';

// The studio server: a local page to compare icon sets, choose references, flip fill regions, edit subjects and styles, and
// start runs or redraws. It serves the built studio page and a small JSON API over pipeline.ts, on the loopback interface only.
// Reference: .documentation/tech/pipeline.md.

/** The built studio page, written by `npm run build`; `../dist/` resolves the same from `src/` and from `dist/`. */
const PAGE = fileURLToPath(new URL('../dist/studio/browser/', import.meta.url));
/** A file of the page folder: one segment with an extension, so never a path out of it. */
const PAGE_FILE = /^[\w-]+(\.[\w-]+)+$/;
const TYPES: Partial<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ico': 'image/x-icon'
};
const NAME = /^[\w-]+$/;
const INCOMPLETE = 'Enter the base URL, API key and models in Settings';
const NO_PROJECT = 'no project is open, open or create one under Project';

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

const checkPrompt = (prompt: unknown): void => {
  check(typeof prompt === 'string' && prompt.includes('{subject}'), 'a style prompt needs {subject}');
  check((prompt as string).trim().startsWith('# '), 'a style prompt starts with a # heading');
};

/** Refuses a stem that cannot name a new icon: not a file name, a fill, or taken by one of `taken`. */
const checkStem = (stem: unknown, taken: readonly { stem: unknown }[]): void => {
  check(typeof stem === 'string' && NAME.test(stem), 'a stem takes letters, digits, dashes and underscores');
  check(!(stem as string).endsWith('-filled'), 'a stem ending in -filled names the fill of another icon');
  check(!taken.some((icon) => icon.stem === stem), `${String(stem)} exists`);
};

const read = (file: string): string => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');

/** A native folder picker: the command, its arguments, and the exit code of a cancelled dialog. */
interface Picker {
  command: string;
  args: string[];
  cancelled: number;
}

/** The folder picker of each platform, opened at `dir`. */
const PICKERS: Partial<Record<string, (dir: string) => Picker>> = {
  // Finder hosts the dialog so that it opens in front; the app that was in front, the browser, comes back afterwards
  darwin: (dir) => ({
    command: 'osascript',
    args: [
      'set previous to path to frontmost application as text',
      'set chosen to missing value',
      'tell application "Finder"',
      'activate',
      'try',
      `set chosen to choose folder with prompt "Choose the project folder" default location POSIX file "${dir.replace(/[\\"]/g, '\\$&')}"`,
      'end try',
      'end tell',
      'tell application previous to activate',
      'if chosen is missing value then return ""',
      'POSIX path of chosen'
    ].flatMap((line) => ['-e', line]),
    cancelled: 0
  }),
  linux: (dir) => ({
    command: 'zenity',
    args: ['--file-selection', '--directory', '--title', 'Choose the project folder', '--filename', `${dir}/`],
    cancelled: 1
  }),
  win32: (dir) => ({
    command: 'powershell',
    args: [
      '-NoProfile',
      '-Command',
      `Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = 'Choose the project folder'; $d.SelectedPath = '${dir.replaceAll("'", "''")}'; if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath }`
    ],
    cancelled: 0
  })
};

/** Opens the folder picker at `dir` and answers the chosen folder, or undefined when the dialog is cancelled. */
const pickFolder = (dir: string): Promise<string | undefined> => {
  const picker = PICKERS[process.platform];
  check(picker, `no folder picker on ${process.platform}, type the path`);
  const { command, args, cancelled } = picker!(dir);
  return new Promise((resolve, reject) => {
    execFile(command, args, (error, stdout, stderr) => {
      const code = error?.code;
      if (code === 'ENOENT') {
        return reject(new HttpError(400, `no folder picker: ${command} is not installed, type the path`));
      }
      if (error && code !== cancelled) {
        return reject(new Error(`${command} failed: ${stderr.trim() || error.message}`));
      }
      resolve(stdout.trim() || undefined);
    });
  });
};

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

/** The studio server over the project in `folder`, or over none until one is opened: the page in `page`, its files and the JSON API. Not listening yet. */
export const createServer = (folder: string, settingsFile: string, page = PAGE): http.Server => {
  const startFolder = path.resolve(folder);
  let opened = fs.existsSync(path.join(startFolder, CONFIG_FILE)) ? resolveProject(startFolder) : undefined;
  let job: (Job & { kind: string; running: boolean; error?: string }) | undefined;

  /** The open project; every route that needs one is refused while none is open. */
  const project = (): Project => {
    check(opened, NO_PROJECT, 409);
    return opened!;
  };

  const knownSet = (set: unknown): string => {
    check(typeof set === 'string' && sets(project()).includes(set), `unknown set: ${String(set)}`);
    return set as string;
  };
  const busy = (): void => check(!job?.running, 'a drawing job is running, wait for it', 409);
  /** The column directory: the target as `icons`, or a set. */
  const columnDir = (col: unknown): string => (col === 'icons' ? project().target : setDir(project(), knownSet(col)));
  /** The outline file of a drawn icon in the target, `icons`, or in a set. */
  const drawnOutline = (set: unknown, stem: unknown): string => {
    check(
      readConfig(project()).icons.some((icon) => icon.stem === stem && isDrawn(icon)),
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
        ['icons', ...sets(project())].filter(
          (col) =>
            read(path.join(columnDir(col), `${stem}.svg`)) === read(path.join(project().references, `${stem}.svg`))
        )
      ])
    );

  const state = (): object => {
    if (!opened) {
      return { project: null, folder: startFolder };
    }
    const config = readConfig(project());
    const references = versions(project().references);
    return {
      project: project().dir,
      config,
      target: config.target,
      styles: readStyles(project()),
      referencePrompt: REFERENCE_PROMPT,
      icons: versions(project().target),
      references,
      referencedIn: referencedIn(Object.keys(references)),
      sets: sets(project()).map((set) => ({
        set,
        info: readSet(project(), set),
        files: versions(setDir(project(), set))
      })),
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
      /^\/api\/project$/,
      (_, { dir }) => {
        busy();
        check(typeof dir === 'string' && path.isAbsolute(dir), 'a project folder is an absolute path');
        try {
          opened = resolveProject(dir as string);
        } catch (e) {
          throw new HttpError(400, (e as Error).message);
        }
        job = undefined;
      }
    ],
    [
      'POST',
      /^\/api\/project$/,
      (_, { dir }) => {
        busy();
        check(typeof dir === 'string' && path.isAbsolute(dir), 'a project folder is an absolute path');
        check(!fs.existsSync(path.join(dir as string, CONFIG_FILE)), `already a project: ${dir as string}`);
        opened = createProject(dir as string);
        job = undefined;
      }
    ],
    ['POST', /^\/api\/pick-folder$/, async () => ({ dir: (await pickFolder(opened?.dir ?? startFolder)) ?? null })],
    [
      'PUT',
      /^\/api\/styles\/([\w-]+)$/,
      ([name], { prompt }) => {
        checkPrompt(prompt);
        fs.mkdirSync(project().styles, { recursive: true });
        fs.writeFileSync(path.join(project().styles, `${name}.md`), `${(prompt as string).trim()}\n`);
      }
    ],
    [
      'DELETE',
      /^\/api\/styles\/([\w-]+)$/,
      ([name]) => {
        check(fs.existsSync(path.join(project().styles, `${name}.md`)), `unknown style: ${name}`);
        fs.rmSync(path.join(project().styles, `${name}.md`));
      }
    ],
    [
      'POST',
      /^\/api\/runs$/,
      (_, { styles, quality, stems }) => {
        check(Array.isArray(styles) && styles.length, 'choose at least one style');
        const known = readStyles(project()).map((style) => style.name);
        check(
          (styles as unknown[]).every((style) => known.includes(style as string)),
          'choose known styles'
        );
        check(['low', 'medium', 'high'].includes(quality as string), 'quality is low, medium or high');
        // a test run: only the chosen drawn icons, and their rotations
        const drawn = readConfig(project())
          .icons.filter(isDrawn)
          .map((icon) => icon.stem);
        check(
          stems === undefined ||
            (Array.isArray(stems) &&
              stems.length &&
              new Set(stems).size === stems.length &&
              stems.every((stem) => drawn.includes(stem as string))),
          'choose drawn icons of aicon-studio.json, each once'
        );
        const stored = settings('imageModel');
        begin('run', (j) => startRun(project(), stored, styles as string[], quality as string, j, stems as string[]));
      }
    ],
    [
      'POST',
      /^\/api\/stop$/,
      () => {
        check(job?.running, 'no drawing job is running');
        job!.stopped = true;
      }
    ],
    [
      'POST',
      /^\/api\/redraw$/,
      (_, { work }) => {
        check(Array.isArray(work) && work.length, 'choose at least one icon');
        for (const { set } of work as Work[]) {
          knownSet(set);
        }
        const stored = settings('imageModel');
        begin('redraw', (j) => redraw(project(), stored, work as Work[], j));
      }
    ],
    [
      'PUT',
      /^\/api\/subjects\/([\w-]+)$/,
      ([stem], { subject }) => {
        check(
          readConfig(project()).icons.some((icon) => icon.stem === stem && isDrawn(icon)),
          `${stem} is not a drawn icon`
        );
        check(typeof subject === 'string' && subject.trim(), 'a subject must not be empty');
        updateConfig(project(), (config) => ({
          ...config,
          icons: config.icons.map((icon) =>
            icon.stem === stem ? { ...icon, subject: (subject as string).trim() } : icon
          )
        }));
      }
    ],
    [
      'POST',
      /^\/api\/icons$/,
      (_, { stem, subject, from, rotate, icons: list }) => {
        busy();
        const icons = readConfig(project()).icons;
        if (from === undefined) {
          // one drawn icon, or a pasted list of them: all or none
          const added = (list ?? [{ stem, subject }]) as { stem: unknown; subject: unknown }[];
          check(Array.isArray(added) && added.length, 'add at least one icon');
          added.forEach((icon, i) => {
            checkStem(icon.stem, [...icons, ...added.slice(0, i)]);
            check(typeof icon.subject === 'string' && icon.subject.trim(), 'a subject must not be empty');
          });
          updateConfig(project(), (config) => ({
            ...config,
            icons: [
              ...config.icons,
              ...added.map((icon) => ({ stem: icon.stem as string, subject: (icon.subject as string).trim() }))
            ]
          }));
          return;
        }
        checkStem(stem, icons);
        check(
          icons.some((icon) => icon.stem === from && isDrawn(icon)),
          'a rotation turns a drawn icon of aicon-studio.json'
        );
        check([90, 180, 270].includes(rotate as number), 'a rotation turns by 90, 180 or 270 degrees');
        const rotation: Rotated = { stem: stem as string, from: from as string, rotate: rotate as number };
        updateConfig(project(), (config) => ({ ...config, icons: [...config.icons, rotation] }));
        sets(project()).forEach((set) => writeRotation(project(), set, rotation));
      }
    ],
    [
      'DELETE',
      /^\/api\/icons\/([\w-]+)$/,
      ([stem]) => {
        busy();
        const icons = readConfig(project()).icons;
        check(
          icons.some((icon) => icon.stem === stem),
          `unknown icon: ${stem}`
        );
        const rotations = icons.filter((icon) => !isDrawn(icon) && icon.from === stem).map((icon) => icon.stem);
        check(!rotations.length, `remove the rotations of ${stem} first: ${rotations.join(', ')}`);
        updateConfig(project(), (config) => ({ ...config, icons: config.icons.filter((icon) => icon.stem !== stem) }));
        // the sets and the target keep their files: a set records a run, the target what was adopted
        fs.rmSync(path.join(project().references, `${stem}.svg`), { force: true });
      }
    ],
    [
      'PUT',
      /^\/api\/icons\/([\w-]+)$/,
      ([stem], { stem: to }) => {
        busy();
        const icons = readConfig(project()).icons;
        check(
          icons.some((icon) => icon.stem === stem),
          `unknown icon: ${stem}`
        );
        checkStem(to, icons);
        const name = (s: string): string => (s === stem ? (to as string) : s);
        const rekey = <T>(record: Record<string, T>): Record<string, T> =>
          Object.fromEntries(
            Object.entries(record)
              .filter(([s]) => s !== to)
              .map(([s, v]) => [name(s), v])
          );
        updateConfig(project(), (config) => ({
          ...config,
          icons: config.icons.map((icon) =>
            isDrawn(icon)
              ? { ...icon, stem: name(icon.stem) }
              : { ...icon, stem: name(icon.stem), from: name(icon.from) }
          )
        }));
        // the files of the new stem, leftovers of a removed icon, are overwritten; the page warns first
        const move = (dir: string, suffix = ''): void => {
          const file = path.join(dir, `${stem}${suffix}.svg`);
          if (fs.existsSync(file)) {
            fs.renameSync(file, path.join(dir, `${to as string}${suffix}.svg`));
          }
        };
        move(project().references);
        for (const dir of [project().target, ...sets(project()).map((set) => setDir(project(), set))]) {
          move(dir);
          move(dir, '-filled');
        }
        for (const set of sets(project())) {
          updateSet(project(), set, (info) => ({
            ...info,
            icons: info.icons.filter((icon) => icon.stem !== to).map((icon) => ({ ...icon, stem: name(icon.stem) })),
            failed: info.failed.filter((s) => s !== to).map(name),
            failures: rekey(info.failures),
            flips: rekey(info.flips)
          }));
        }
      }
    ],
    [
      'PUT',
      /^\/api\/icons$/,
      (_, { order }) => {
        busy();
        const icons = readConfig(project()).icons;
        check(
          Array.isArray(order) &&
            order.length === icons.length &&
            new Set(order).size === order.length &&
            icons.every((icon) => order.includes(icon.stem)),
          'the order names every icon once'
        );
        updateConfig(project(), (config) => ({
          ...config,
          icons: (order as string[]).map((stem) => config.icons.find((icon) => icon.stem === stem)!)
        }));
      }
    ],
    [
      'PUT',
      /^\/api\/references\/([\w-]+)$/,
      ([stem], { set }) => {
        const from = drawnOutline(set, stem);
        fs.mkdirSync(project().references, { recursive: true });
        fs.copyFileSync(from, path.join(project().references, `${stem}.svg`));
      }
    ],
    [
      'DELETE',
      /^\/api\/references\/([\w-]+)$/,
      ([stem]) => {
        check(fs.existsSync(path.join(project().references, `${stem}.svg`)), `${stem} is not referenced`);
        fs.rmSync(path.join(project().references, `${stem}.svg`));
      }
    ],
    [
      'POST',
      /^\/api\/describe$/,
      async (_, { set, stem }) => {
        const file = drawnOutline(set, stem);
        const icon = readConfig(project())
          .icons.filter(isDrawn)
          .find((i) => i.stem === stem)!;
        return { subject: await describe(settings('describeModel'), file, icon.stem, icon.subject) };
      }
    ],
    [
      'POST',
      /^\/api\/rephrase$/,
      async (_, { prompt, stem, set, reason }) => {
        check(typeof reason === 'string' && reason.trim(), 'give a reason');
        const why = (reason as string).trim();
        if (stem === undefined) {
          checkPrompt(prompt);
          return { prompt: await rephrase(settings('describeModel'), prompt as string, why) };
        }
        // a subject, with the style of the set it was drawn in
        const icon = readConfig(project())
          .icons.filter(isDrawn)
          .find((i) => i.stem === stem);
        check(icon, `${stem as string} is not a drawn icon`);
        const style = set === undefined ? undefined : readSet(project(), knownSet(set)).prompt;
        return { subject: await rephraseSubject(settings('describeModel'), icon!.subject, why, style) };
      }
    ],
    [
      'PUT',
      /^\/api\/flips$/,
      async (_, { set, stem, points }) => {
        busy();
        const known = knownSet(set);
        check(
          readSet(project(), known).icons.some((icon) => icon.stem === stem),
          `${String(stem)} is not drawn in ${known}`
        );
        check(
          Array.isArray(points) && points.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)),
          'points are [x, y] pairs'
        );
        updateSet(project(), known, (info) => ({
          ...info,
          flips: { ...info.flips, [stem as string]: points as [number, number][] }
        }));
        await refill(project(), known, [stem as string]);
      }
    ],
    [
      'DELETE',
      /^\/api\/sets\/([\w-]+)\/([\w-]+)$/,
      ([run, style]) => {
        busy();
        const set = knownSet(`${run}/${style}`);
        fs.rmSync(setDir(project(), set), { recursive: true });
        if (!fs.readdirSync(path.join(project().runs, run)).length) {
          fs.rmdirSync(path.join(project().runs, run));
        }
      }
    ],
    [
      'POST',
      /^\/api\/adopt$/,
      (_, { set }) => {
        busy();
        const dir = setDir(project(), knownSet(set));
        fs.mkdirSync(project().target, { recursive: true });
        for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.svg'))) {
          fs.copyFileSync(path.join(dir, file), path.join(project().target, file));
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
    const dir = { icons: project().target, sets: project().runs, references: project().references }[root];
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
      if (req.method === 'GET' && (url === '/' || PAGE_FILE.test(url.slice(1)))) {
        const file = path.join(page, url === '/' ? 'index.html' : url.slice(1));
        return fs.existsSync(file)
          ? send(200, TYPES[path.extname(file)] ?? 'application/octet-stream', fs.readFileSync(file))
          : send(404, 'text/plain', 'not found');
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
