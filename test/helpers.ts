import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUN_FILE, type SetInfo } from '../src/pipeline.ts';
import {
  CONFIG_FILE,
  isDrawn,
  resolveProject,
  type Config,
  type Drawn,
  type Project,
  type Rotated
} from '../src/project.ts';
import { writeSettings, type Settings } from '../src/settings.ts';

export const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));
export const EXAMPLE = fileURLToPath(new URL('../example/', import.meta.url));
export const SOFT_PROMPT = fs.readFileSync(path.join(EXAMPLE, 'styles', 'soft.md'), 'utf8').trim();
export const SHARP_PROMPT = fs.readFileSync(path.join(EXAMPLE, 'styles', 'sharp.md'), 'utf8').trim();

/** The icons of the fixture project: three drawn, one rotation. */
export const ICONS: (Drawn | Rotated)[] = [
  { stem: 'home', subject: 'a house' },
  { stem: 'search', subject: 'a magnifying glass' },
  { stem: 'chevron-right', subject: 'a chevron pointing right' },
  { stem: 'chevron-down', from: 'chevron-right', rotate: 90 }
];
/** The files of a complete set of the fixture project, without `.svg`. */
export const SET_FILES = [
  'home',
  'home-filled',
  'search',
  'search-filled',
  'chevron-right',
  'chevron-right-filled',
  'chevron-down',
  'chevron-down-filled'
];

export const tmpDir = (): string => fs.mkdtempSync(path.join(os.tmpdir(), 'aicon-'));
export const read = (file: string): string => fs.readFileSync(file, 'utf8');
export const readJson = <T>(file: string): T => JSON.parse(read(file)) as T;

interface ProjectOptions {
  target?: string;
  quality?: Config['quality'];
  icons?: (Drawn | Rotated)[];
  styles?: Record<string, string>;
  /** Sets to create from the fixture files, as `<run>/<style>`. */
  sets?: string[];
  /** Files of the fixture set copied into the target. */
  targetFiles?: string[];
}

/** A project in a temporary folder, built from the fixtures. */
export const makeProject = ({
  target = './icons',
  quality = 'medium',
  icons = ICONS,
  styles = { soft: SOFT_PROMPT },
  sets = [],
  targetFiles = ['home', 'home-filled']
}: ProjectOptions = {}): { dir: string; project: Project } => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, CONFIG_FILE), `${JSON.stringify({ target, quality, icons }, null, 2)}\n`);
  fs.mkdirSync(path.join(dir, 'styles'));
  fs.mkdirSync(path.join(dir, 'references'));
  Object.entries(styles).forEach(([name, prompt]) =>
    fs.writeFileSync(path.join(dir, 'styles', `${name}.md`), `${prompt}\n`)
  );
  for (const set of sets) {
    const [run, style] = set.split('/') as [string, string];
    const setDir = path.join(dir, 'runs', run, style);
    fs.mkdirSync(setDir, { recursive: true });
    const info: SetInfo = {
      run,
      style,
      imageModel: 'img-model',
      quality,
      prompt: styles[style] ?? SOFT_PROMPT,
      icons: icons.filter(isDrawn).map(({ stem, subject }) => ({ stem, subject, referenced: false })),
      failed: [],
      flips: {}
    };
    fs.writeFileSync(path.join(setDir, RUN_FILE), `${JSON.stringify(info, null, 2)}\n`);
    SET_FILES.forEach((f) => fs.copyFileSync(path.join(FIXTURES, 'set', `${f}.svg`), path.join(setDir, `${f}.svg`)));
  }
  if (targetFiles.length) {
    const targetDir = path.resolve(dir, target);
    fs.mkdirSync(targetDir, { recursive: true });
    targetFiles.forEach((f) =>
      fs.copyFileSync(path.join(FIXTURES, 'set', `${f}.svg`), path.join(targetDir, `${f}.svg`))
    );
  }
  return { dir, project: resolveProject(dir) };
};

export const COMPLETE_SETTINGS: Settings = {
  baseUrl: 'http://127.0.0.1:1/v1',
  apiKey: 'test-key',
  imageModel: 'img-model',
  describeModel: 'chat-model'
};

/** A settings file path in a temporary folder, written when settings are given. */
export const makeSettingsFile = (settings?: Settings): string => {
  const file = path.join(tmpDir(), 'aicon-studio', 'settings.json');
  if (settings) {
    writeSettings(file, settings);
  }
  return file;
};

/** Listens on a free loopback port and returns it. */
export const listen = (server: http.Server): Promise<number> =>
  new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as { port: number }).port)));

export const close = (server: http.Server): Promise<void> => new Promise((resolve) => server.close(() => resolve()));

export interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  text: string;
  json: Record<string, unknown>;
}

/**
 * A request to the studio with full control of the headers, which `fetch` denies for `Host`.
 * Every request but GET carries a JSON content type unless the headers say otherwise, as the page does.
 */
export const request = (
  port: number,
  method: string,
  url: string,
  { headers = {}, body }: { headers?: Record<string, string>; body?: unknown } = {}
): Promise<Reply> =>
  new Promise((resolve, reject) => {
    const sent = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
    const req = http.request({ host: '127.0.0.1', port, method, path: url, setHost: false }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => (text += chunk));
      res.on('end', () => {
        let json: Record<string, unknown> = {};
        try {
          json = JSON.parse(text) as Record<string, unknown>;
        } catch {
          // not JSON
        }
        resolve({ status: res.statusCode ?? 0, headers: res.headers, text, json });
      });
    });
    req.on('error', reject);
    req.setHeader('Host', `127.0.0.1:${port}`);
    if (method !== 'GET') {
      req.setHeader('Content-Type', 'application/json');
    }
    Object.entries(headers).forEach(([name, value]) => req.setHeader(name, value));
    req.end(sent);
  });

/** Every file under `dir`, relative, sorted, except those under `except`. */
export const fileList = (dir: string, except?: string): string[] =>
  fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
    .filter((file) => !except || !path.resolve(dir, file).startsWith(`${except}${path.sep}`))
    .sort();

/** Local time as yyyy-mm-dd-hhmm, the name of a run started now. */
export const runName = (now = new Date()): string => {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
};
