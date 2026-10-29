import * as fs from 'node:fs';
import type * as http from 'node:http';
import * as path from 'node:path';
import { RUN_FILE, type SetInfo } from '../src/pipeline.ts';
import { CONFIG_FILE, type Config, type Project } from '../src/project.ts';
import { createServer } from '../src/server.ts';
import { readSettings, writeSettings, type Settings } from '../src/settings.ts';
import {
  close,
  COMPLETE_SETTINGS,
  fileList,
  FIXTURES,
  ICONS,
  listen,
  makePage,
  makeProject,
  makeSettingsFile,
  read,
  readJson,
  request,
  SET_FILES,
  SHARP_PROMPT,
  tmpDir,
  type Reply
} from './helpers.ts';

const SET = '2026-01-01-0000/soft';
const FLIP: [number, number] = [509.1, 516.1];

let dir: string;
let page: string;
let project: Project;
let settingsFile: string;
let server: http.Server;
let port: number;

const start = async (options: Parameters<typeof makeProject>[0] = {}, settings?: Settings): Promise<void> => {
  ({ dir, project } = makeProject({ sets: [SET], ...options }));
  settingsFile = makeSettingsFile(settings);
  page = makePage();
  server = createServer(project, settingsFile, page);
  port = await listen(server);
};
const api = (method: string, url: string, body?: unknown): Promise<Reply> => request(port, method, url, { body });
const state = async (): Promise<Record<string, unknown>> => (await api('GET', '/api/state')).json;
const setFile = (file: string): string => path.join(project.runs, ...SET.split('/'), file);
const setInfo = (): SetInfo => readJson<SetInfo>(setFile(RUN_FILE));

afterEach(async () => {
  await close(server);
});

describe('page', () => {
  beforeEach(() => start());

  it('serves the page to the local host', async () => {
    const reply = await api('GET', '/');

    expect([reply.status, reply.headers['content-type'], reply.text]).toEqual([
      200,
      'text/html; charset=utf-8',
      read(path.join(page, 'index.html'))
    ]);
  });

  it('serves a file of the page folder with its type', async () => {
    const reply = await api('GET', '/main-AB12.js');

    expect([reply.status, reply.headers['content-type'], reply.text]).toEqual([
      200,
      'text/javascript; charset=utf-8',
      read(path.join(page, 'main-AB12.js'))
    ]);
  });

  it('refuses a path outside the page folder', async () => {
    const replies = await Promise.all([api('GET', '/..%2Fpackage.json'), api('GET', '/a/main-AB12.js')]);

    expect(replies.map((r) => r.status)).toEqual([404, 404]);
  });

  it('answers 404 for a missing page file', async () => {
    const reply = await api('GET', '/nope.js');

    expect(reply.status).toBe(404);
  });
});

describe('guard', () => {
  beforeEach(() => start());

  it('accepts localhost as host', async () => {
    const reply = await request(port, 'GET', '/api/state', { headers: { Host: `localhost:${port}` } });

    expect(reply.status).toBe(200);
  });

  it('rejects a foreign host', async () => {
    const reply = await request(port, 'GET', '/api/state', { headers: { Host: `evil.example:${port}` } });

    expect(reply.status).toBe(403);
  });

  it('rejects a foreign origin on a write', async () => {
    const reply = await request(port, 'POST', '/api/adopt', {
      headers: { Origin: 'http://evil.example' },
      body: { set: SET }
    });

    expect([reply.status, fs.existsSync(path.join(project.target, 'search.svg'))]).toEqual([403, false]);
  });

  it("accepts the page's own origin", async () => {
    const reply = await request(port, 'PUT', '/api/subjects/home', {
      headers: { Origin: `http://127.0.0.1:${port}` },
      body: { subject: 'a cottage' }
    });

    expect(reply.status).toBe(200);
  });

  it('rejects a write without a JSON content type', async () => {
    const reply = await request(port, 'POST', '/api/adopt', {
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ set: SET })
    });

    expect([reply.status, fs.existsSync(path.join(project.target, 'search.svg'))]).toEqual([403, false]);
  });
});

describe('state', () => {
  it('lists every set, newest run first', async () => {
    await start({ sets: [SET, '2026-01-02-0000/soft'] });

    expect(((await state())['sets'] as { set: string }[]).map((s) => s.set)).toEqual(['2026-01-02-0000/soft', SET]);
  });

  it('ignores a run folder without _run.json', async () => {
    await start();
    fs.mkdirSync(path.join(project.runs, 'stray', 'soft'), { recursive: true });

    expect(((await state())['sets'] as { set: string }[]).map((s) => s.set)).toEqual([SET]);
  });

  it('shows the target as written and its files', async () => {
    await start();
    const s = await state();

    expect([s['target'], Object.keys(s['icons'] as object).sort()]).toEqual(['./icons', ['home', 'home-filled']]);
  });

  it('shows an empty target before the first adopt', async () => {
    await start({ target: './missing', targetFiles: [] });

    expect((await state())['icons']).toEqual({});
  });

  it('names the columns whose outline is the reference', async () => {
    await start({ targetFiles: [] });
    fs.copyFileSync(setFile('home.svg'), path.join(project.references, 'home.svg'));

    expect((await state())['referencedIn']).toEqual({ home: [SET] });
  });

  it('shows the settings without the key', async () => {
    await start({}, COMPLETE_SETTINGS);

    expect((await state())['settings']).toEqual({
      baseUrl: COMPLETE_SETTINGS.baseUrl,
      imageModel: 'img-model',
      describeModel: 'chat-model',
      hasApiKey: true
    });
  });
});

describe('styles', () => {
  beforeEach(() => start());

  it('saves a style', async () => {
    await api('PUT', '/api/styles/bold', { prompt: '# Bold\n\nDraw {subject} boldly.\n\n' });

    expect(read(path.join(project.styles, 'bold.md'))).toBe('# Bold\n\nDraw {subject} boldly.\n');
  });

  it('refuses a prompt without {subject}', async () => {
    const reply = await api('PUT', '/api/styles/bold', { prompt: '# Bold\n\nDraw boldly.' });

    expect(reply.status).toBe(400);
  });

  it('refuses a prompt without a heading', async () => {
    const reply = await api('PUT', '/api/styles/bold', { prompt: 'Draw {subject} boldly.' });

    expect(reply.status).toBe(400);
  });

  it('deletes a style', async () => {
    await api('DELETE', '/api/styles/soft');

    expect(fs.existsSync(path.join(project.styles, 'soft.md'))).toBe(false);
  });

  it('refuses to delete an unknown style', async () => {
    const reply = await api('DELETE', '/api/styles/nope');

    expect(reply.status).toBe(400);
  });
});

describe('subjects', () => {
  beforeEach(() => start());

  it('saves a trimmed subject into aicon-studio.json', async () => {
    await api('PUT', '/api/subjects/home', { subject: ' a cottage ' });

    expect(readJson<Config>(path.join(dir, CONFIG_FILE)).icons[0]).toEqual({ stem: 'home', subject: 'a cottage' });
  });

  it('refuses a subject for a rotation', async () => {
    const reply = await api('PUT', '/api/subjects/chevron-down', { subject: 'a chevron' });

    expect(reply.status).toBe(400);
  });

  it('refuses an empty subject', async () => {
    const reply = await api('PUT', '/api/subjects/home', { subject: ' ' });

    expect(reply.status).toBe(400);
  });
});

describe('icons', () => {
  beforeEach(() => start());
  const config = (): Config => readJson<Config>(path.join(dir, CONFIG_FILE));

  it('appends a drawn icon with a trimmed subject', async () => {
    await api('POST', '/api/icons', { stem: 'gear', subject: ' a gear ' });

    expect(config().icons.at(-1)).toEqual({ stem: 'gear', subject: 'a gear' });
  });

  it('appends a rotation and writes its files into every set that holds its from outline', async () => {
    const rotation = { stem: 'chevron-up', from: 'chevron-right', rotate: 270 };
    await api('POST', '/api/icons', rotation);

    expect([
      config().icons.at(-1),
      read(setFile('chevron-up.svg')).includes('rotate(270 '),
      read(setFile('chevron-up-filled.svg')).includes('rotate(270 ')
    ]).toEqual([rotation, true, true]);
  });

  it('refuses a stem that exists', async () => {
    const reply = await api('POST', '/api/icons', { stem: 'home', subject: 'x' });

    expect(reply.status).toBe(400);
  });

  it('refuses a stem outside letters, digits, dashes and underscores', async () => {
    const reply = await api('POST', '/api/icons', { stem: 'a b', subject: 'x' });

    expect(reply.status).toBe(400);
  });

  it('refuses an empty subject', async () => {
    const reply = await api('POST', '/api/icons', { stem: 'gear', subject: '  ' });

    expect(reply.status).toBe(400);
  });

  it('refuses a rotation of an unknown icon or of a rotation', async () => {
    const replies = await Promise.all(
      ['nope', 'chevron-down'].map((from) => api('POST', '/api/icons', { stem: 'chevron-up', from, rotate: 270 }))
    );

    expect(replies.map((r) => r.status)).toEqual([400, 400]);
  });

  it('refuses an angle other than 90, 180, 270', async () => {
    const reply = await api('POST', '/api/icons', { stem: 'chevron-up', from: 'chevron-right', rotate: 45 });

    expect(reply.status).toBe(400);
  });

  it('removes the icon and its reference', async () => {
    await api('PUT', '/api/references/home', { set: SET });
    await api('DELETE', '/api/icons/home');

    expect([
      config().icons.some((icon) => icon.stem === 'home'),
      fs.existsSync(path.join(project.references, 'home.svg'))
    ]).toEqual([false, false]);
  });

  it('keeps the files of the sets and the target', async () => {
    await api('DELETE', '/api/icons/home');

    expect([fs.existsSync(setFile('home.svg')), fs.existsSync(path.join(project.target, 'home.svg'))]).toEqual([
      true,
      true
    ]);
  });

  it('refuses to remove an icon that rotations come from', async () => {
    const reply = await api('DELETE', '/api/icons/chevron-right');

    expect([reply.status, String(reply.json['error']).includes('chevron-down')]).toEqual([400, true]);
  });

  it('refuses to remove an unknown icon', async () => {
    const reply = await api('DELETE', '/api/icons/nope');

    expect(reply.status).toBe(400);
  });

  it('writes the icons in the given order', async () => {
    await api('PUT', '/api/icons', { order: ['search', 'home', 'chevron-down', 'chevron-right'] });

    expect(config().icons).toEqual([ICONS[1], ICONS[0], ICONS[3], ICONS[2]]);
  });

  it('refuses an order that is not every stem once', async () => {
    const replies = await Promise.all(
      [
        ['search', 'home', 'chevron-down'],
        ['search', 'home', 'home', 'chevron-down', 'chevron-right'],
        ['search', 'home', 'chevron-down', 'nope']
      ].map((order) => api('PUT', '/api/icons', { order }))
    );

    expect([replies.map((r) => r.status), config().icons]).toEqual([[400, 400, 400], ICONS]);
  });
});

describe('references', () => {
  beforeEach(() => start());

  it("copies a set's drawing as the reference", async () => {
    await api('PUT', '/api/references/home', { set: SET });

    expect(read(path.join(project.references, 'home.svg'))).toBe(read(setFile('home.svg')));
  });

  it('copies the current icon as the reference', async () => {
    fs.copyFileSync(setFile('search.svg'), path.join(project.target, 'home.svg'));
    await api('PUT', '/api/references/home', { set: 'icons' });

    expect(read(path.join(project.references, 'home.svg'))).toBe(read(setFile('search.svg')));
  });

  it('refuses a reference for a stem without a file', async () => {
    const reply = await api('PUT', '/api/references/search', { set: 'icons' });

    expect(reply.status).toBe(400);
  });

  it('removes a reference', async () => {
    await api('PUT', '/api/references/home', { set: SET });
    await api('DELETE', '/api/references/home');

    expect(fs.existsSync(path.join(project.references, 'home.svg'))).toBe(false);
  });

  it('refuses to remove an unknown reference', async () => {
    const reply = await api('DELETE', '/api/references/search');

    expect(reply.status).toBe(400);
  });
});

describe('runs and redraws', () => {
  it('refuses a run without styles', async () => {
    await start({}, COMPLETE_SETTINGS);
    const reply = await api('POST', '/api/runs', { styles: [], quality: 'medium' });

    expect(reply.status).toBe(400);
  });

  it('refuses an unknown style', async () => {
    await start({}, COMPLETE_SETTINGS);
    const reply = await api('POST', '/api/runs', { styles: ['nope'], quality: 'medium' });

    expect(reply.status).toBe(400);
  });

  it('refuses an unknown quality', async () => {
    await start({}, COMPLETE_SETTINGS);
    const reply = await api('POST', '/api/runs', { styles: ['soft'], quality: 'ultra' });

    expect(reply.status).toBe(400);
  });

  it('refuses a run before the settings are complete', async () => {
    await start();
    const reply = await api('POST', '/api/runs', { styles: ['soft'], quality: 'medium' });

    expect([reply.status, reply.json['error']]).toEqual([400, 'Enter the base URL, API key and models in Settings']);
  });

  it('refuses a redraw of an unknown set', async () => {
    await start({}, COMPLETE_SETTINGS);
    const reply = await api('POST', '/api/redraw', { set: 'nope/soft', stems: ['home'] });

    expect(reply.status).toBe(400);
  });

  it('refuses a redraw without stems', async () => {
    await start({}, COMPLETE_SETTINGS);
    const reply = await api('POST', '/api/redraw', { set: SET, stems: [] });

    expect(reply.status).toBe(400);
  });
});

describe('flips', () => {
  beforeEach(() => start());

  it('stores the flips and derives the fill', async () => {
    await api('PUT', '/api/flips', { set: SET, stem: 'home', points: [FLIP] });

    expect([setInfo().flips, read(setFile('home-filled.svg'))]).toEqual([
      { home: [FLIP] },
      read(path.join(FIXTURES, 'home-flipped.svg'))
    ]);
  });

  it('refuses flips for a stem not drawn in the set', async () => {
    const reply = await api('PUT', '/api/flips', { set: SET, stem: 'chevron-down', points: [] });

    expect(reply.status).toBe(400);
  });

  it('refuses points that are not pairs', async () => {
    const reply = await api('PUT', '/api/flips', { set: SET, stem: 'home', points: [[1]] });

    expect(reply.status).toBe(400);
  });
});

describe('sets', () => {
  it('deletes a set and its empty run folder', async () => {
    await start();
    await api('DELETE', `/api/sets/${SET}`);

    expect(fs.existsSync(path.join(project.runs, '2026-01-01-0000'))).toBe(false);
  });

  it('keeps a run folder that still holds a set', async () => {
    await start({ sets: [SET, '2026-01-01-0000/sharp'] });
    await api('DELETE', `/api/sets/${SET}`);

    expect(fs.readdirSync(path.join(project.runs, '2026-01-01-0000'))).toEqual(['sharp']);
  });
});

describe('adopt', () => {
  it('copies every SVG of the set into the target', async () => {
    await start();
    await api('POST', '/api/adopt', { set: SET });

    expect(fs.readdirSync(project.target).sort()).toEqual(SET_FILES.map((f) => `${f}.svg`).sort());
    expect(SET_FILES.map((f) => read(path.join(project.target, `${f}.svg`)))).toEqual(
      SET_FILES.map((f) => read(setFile(`${f}.svg`)))
    );
  });

  it('creates a missing target', async () => {
    await start({ target: './fresh', targetFiles: [] });
    await api('POST', '/api/adopt', { set: SET });

    expect(fs.readdirSync(project.target).sort()).toEqual(SET_FILES.map((f) => `${f}.svg`).sort());
  });

  it('writes nothing outside the target', async () => {
    await start();
    const before = fileList(dir, project.target);
    await api('POST', '/api/adopt', { set: SET });

    expect(fileList(dir, project.target)).toEqual(before);
  });
});

describe('files', () => {
  beforeEach(() => start());

  it('serves a set file immutable', async () => {
    const reply = await api('GET', `/files/sets/${SET}/home.svg`);

    expect([reply.status, reply.headers['content-type'], reply.headers['cache-control'], reply.text]).toEqual([
      200,
      'image/svg+xml',
      'max-age=31536000, immutable',
      read(setFile('home.svg'))
    ]);
  });

  it('serves a reference and a target file', async () => {
    await api('PUT', '/api/references/home', { set: SET });
    const replies = await Promise.all([api('GET', '/files/references/home.svg'), api('GET', '/files/icons/home.svg')]);

    expect(replies.map((r) => r.status)).toEqual([200, 200]);
  });

  it('refuses a path outside the project', async () => {
    const reply = await api('GET', '/files/sets/../../aicon-studio.json');

    expect(reply.status).toBe(404);
  });
});

describe('settings', () => {
  const sent = {
    baseUrl: 'http://127.0.0.1:1/v1/',
    apiKey: 'k',
    imageModel: 'm',
    describeModel: 'd',
    pricePlain: 0.01,
    priceReferenced: 0.05
  };

  beforeEach(() => start());

  it('saves the settings owner-only', async () => {
    await api('PUT', '/api/settings', sent);

    expect([
      readSettings(settingsFile),
      fs.statSync(settingsFile).mode & 0o777,
      ((await state())['settings'] as { hasApiKey: boolean }).hasApiKey
    ]).toEqual([{ ...sent, baseUrl: 'http://127.0.0.1:1/v1' }, 0o600, true]);
  });

  it('keeps the stored key when none is sent', async () => {
    writeSettings(settingsFile, { ...COMPLETE_SETTINGS, apiKey: 'k' });
    const { apiKey: _apiKey, ...rest } = sent;
    await api('PUT', '/api/settings', rest);

    expect(readSettings(settingsFile).apiKey).toBe('k');
  });

  it('clears the prices when none are sent', async () => {
    await api('PUT', '/api/settings', sent);
    const { pricePlain: _plain, priceReferenced: _referenced, ...rest } = sent;
    await api('PUT', '/api/settings', rest);

    expect(readSettings(settingsFile)).toEqual({ ...rest, baseUrl: 'http://127.0.0.1:1/v1' });
  });

  it('refuses a base URL that is not http(s)', async () => {
    const reply = await api('PUT', '/api/settings', { ...sent, baseUrl: 'ftp://x' });

    expect(reply.status).toBe(400);
  });

  it('refuses incomplete settings', async () => {
    const { imageModel: _imageModel, ...rest } = sent;
    const reply = await api('PUT', '/api/settings', rest);

    expect(reply.status).toBe(400);
  });
});

describe('project', () => {
  beforeEach(() => start());

  it('shows the project folder', async () => {
    expect((await state())['project']).toBe(dir);
  });

  it('switches to another project', async () => {
    const other = makeProject({ target: './other-icons', sets: ['2026-02-02-0000/soft'] });
    await api('PUT', '/api/project', { dir: other.dir });
    const switched = await state();

    expect([
      switched['project'],
      switched['target'],
      (switched['sets'] as { set: string }[]).map((s) => s.set)
    ]).toEqual([other.dir, './other-icons', ['2026-02-02-0000/soft']]);
  });

  it('writes into the new project', async () => {
    const other = makeProject();
    await api('PUT', '/api/project', { dir: other.dir });
    await api('PUT', '/api/styles/bold', { prompt: SHARP_PROMPT });

    expect([other.dir, dir].map((d) => fs.existsSync(path.join(d, 'styles', 'bold.md')))).toEqual([true, false]);
  });

  it('refuses a folder without aicon-studio.json', async () => {
    const empty = tmpDir();
    const reply = await api('PUT', '/api/project', { dir: empty });

    expect([reply.status, reply.json['error'], (await state())['project']]).toEqual([
      400,
      `no aicon-studio.json in ${empty}`,
      dir
    ]);
  });

  it('refuses a relative folder', async () => {
    const reply = await api('PUT', '/api/project', { dir: 'example' });

    expect([reply.status, (await state())['project']]).toEqual([400, dir]);
  });
});
