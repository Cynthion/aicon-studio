import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  describe as describeDrawing,
  newJob,
  readSet,
  redraw,
  REFERENCE_PROMPT,
  RUN_FILE,
  startRun,
  updateSet
} from '../src/pipeline.ts';
import type { Drawn, Project, Rotated } from '../src/project.ts';
import { createServer } from '../src/server.ts';
import { type Settings } from '../src/settings.ts';
import {
  close,
  FIXTURES,
  ICONS,
  listen,
  makeProject,
  makeSettingsFile,
  read,
  request,
  runName,
  SET_FILES,
  SHARP_PROMPT,
  SOFT_PROMPT
} from './helpers.ts';
import { startStub, type Stub } from './stub.ts';

const HOME_ONLY = [{ stem: 'home', subject: 'a house' }];
const HOME_PROMPT = SOFT_PROMPT.replaceAll('{subject}', 'a house');

let stub: Stub;
let project: Project;
let settings: Settings;

const run = async (styles = ['soft'], icons: (Drawn | Rotated)[] = HOME_ONLY): Promise<string> => {
  ({ project } = makeProject({ icons, styles: { soft: SOFT_PROMPT, sharp: SHARP_PROMPT }, targetFiles: [] }));
  const job = newJob();
  await startRun(project, settings, styles, 'medium', job);
  return job.sets[0];
};
const setPath = (set: string, file: string): string => path.join(project.runs, ...set.split('/'), file);
const generations = (): number => stub.requests.filter((r) => r.endpoint === 'generations').length;
const viewBox = (markup: string): string => /viewBox="([^"]+)"/.exec(markup)?.[1] ?? '';

beforeEach(async () => {
  stub = await startStub();
  settings = { baseUrl: stub.url, apiKey: 'test-key', imageModel: 'img-model', describeModel: 'chat-model' };
});

afterEach(async () => {
  await stub.close();
});

describe('startRun', () => {
  it('draws every icon of every chosen style into its own set', async () => {
    ({ project } = makeProject({ styles: { soft: SOFT_PROMPT, sharp: SHARP_PROMPT }, targetFiles: [] }));
    const job = newJob();
    await startRun(project, settings, ['soft', 'sharp'], 'medium', job);

    const expected = [RUN_FILE, ...SET_FILES.map((f) => `${f}.svg`)].sort();
    expect([job.sets.map((set) => fs.readdirSync(setPath(set, '')).sort()), job.done, job.failed]).toEqual([
      [expected, expected],
      6,
      []
    ]);
  });

  it('records the set', async () => {
    const set = await run(['soft'], ICONS);

    expect(readSet(project, set)).toEqual({
      run: set.split('/')[0],
      style: 'soft',
      imageModel: 'img-model',
      quality: 'medium',
      prompt: SOFT_PROMPT,
      icons: [
        { stem: 'home', subject: 'a house', referenced: false },
        { stem: 'search', subject: 'a magnifying glass', referenced: false },
        { stem: 'chevron-right', subject: 'a chevron pointing right', referenced: false }
      ],
      failed: [],
      flips: {}
    });
  });

  it('asks images/generations with the prompt', async () => {
    await run();
    const sent = stub.requests[0];

    expect([sent.endpoint, sent.headers.authorization, sent.body]).toEqual([
      'generations',
      'Bearer test-key',
      {
        model: 'img-model',
        prompt: HOME_PROMPT,
        n: 1,
        size: '1024x1024',
        quality: 'medium',
        background: 'transparent',
        output_format: 'png'
      }
    ]);
  });

  it('sends a referenced icon through images/edits with its reference', async () => {
    ({ project } = makeProject({ icons: HOME_ONLY, targetFiles: [] }));
    fs.copyFileSync(path.join(FIXTURES, 'set', 'home.svg'), path.join(project.references, 'home.svg'));
    const job = newJob();
    await startRun(project, settings, ['soft'], 'medium', job);
    const sent = stub.requests[0];

    expect([sent.endpoint, sent.body['prompt'], sent.image > 0, readSet(project, job.sets[0]).icons]).toEqual([
      'edits',
      `${HOME_PROMPT}\n\n${REFERENCE_PROMPT}`,
      true,
      [{ stem: 'home', subject: 'a house', referenced: true }]
    ]);
  });

  it('writes the outline as one path in a square viewBox', async () => {
    const set = await run();
    const markup = read(setPath(set, 'home.svg'));
    const match =
      /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="-?[\d.]+ -?[\d.]+ ([\d.]+) ([\d.]+)"><path fill-rule="evenodd" d="[^"]+"\/><\/svg>\n$/.exec(
        markup
      );

    expect([match !== null, match?.[1] === match?.[2]]).toEqual([true, true]);
  });

  it("derives the fill in the outline's viewBox", async () => {
    const set = await run();

    expect(viewBox(read(setPath(set, 'home-filled.svg')))).toBe(viewBox(read(setPath(set, 'home.svg'))));
  });

  it('rotates both files of a rotation', async () => {
    const set = await run(['soft'], ICONS);
    const rotated = (file: string): string => {
      const markup = read(setPath(set, file));
      const [x, y, side] = viewBox(markup).split(' ').map(Number) as [number, number, number];
      const round = (n: number): number => Math.round(n * 10) / 10;
      return markup.replace('<path', `<path transform="rotate(90 ${round(x + side / 2)} ${round(y + side / 2)})"`);
    };

    expect([read(setPath(set, 'chevron-down.svg')), read(setPath(set, 'chevron-down-filled.svg'))]).toEqual([
      rotated('chevron-right.svg'),
      rotated('chevron-right-filled.svg')
    ]);
  });

  it('waits as long as a rate limit asks', async () => {
    stub.answers.push({ status: 429, headers: { 'retry-after': '1' }, body: { error: { message: 'slow down' } } });
    const set = await run();
    const [first, second] = stub.requests;

    expect([generations(), second.at - first.at >= 2000, fs.existsSync(setPath(set, 'home.svg'))]).toEqual([
      2,
      true,
      true
    ]);
  });

  it('retries a safety block', async () => {
    stub.answers.push({ status: 400, body: { error: { code: 'moderation_blocked' } } });
    const set = await run();

    expect([generations(), fs.existsSync(setPath(set, 'home.svg'))]).toEqual([2, true]);
  });

  it('fails fast on another client error', async () => {
    stub.answers.push({ status: 400, body: { error: { code: 'invalid_prompt', message: 'bad' } } });
    ({ project } = makeProject({ icons: HOME_ONLY, targetFiles: [] }));
    const job = newJob();
    await startRun(project, settings, ['soft'], 'medium', job);
    const set = job.sets[0];

    expect([generations(), readSet(project, set).failed, fs.existsSync(setPath(set, 'home.svg')), job.failed]).toEqual([
      1,
      ['home'],
      false,
      [expect.stringContaining(`${set}/home`)]
    ]);
  });

  it('gives up after five attempts', async () => {
    stub.always = { status: 429, headers: { 'retry-after': '1' }, body: { error: { message: 'slow down' } } };
    const set = await run();

    expect([generations(), readSet(project, set).failed]).toEqual([5, ['home']]);
  });

  it('refuses an unknown style', async () => {
    ({ project } = makeProject({ targetFiles: [] }));

    await expect(startRun(project, settings, ['nope'], 'medium', newJob())).rejects.toThrow('choose known styles');
  });

  it('refuses a second run in the same minute', async () => {
    ({ project } = makeProject({ targetFiles: [] }));
    fs.mkdirSync(path.join(project.runs, runName(), 'soft'), { recursive: true });

    await expect(startRun(project, settings, ['soft'], 'medium', newJob())).rejects.toThrow('exists, wait a minute');
  });
});

describe('redraw', () => {
  it('keeps the last drawing when a redraw fails', async () => {
    const set = await run();
    const drawn = read(setPath(set, 'home.svg'));
    stub.answers.push({ status: 400, body: { error: { code: 'invalid_prompt', message: 'bad' } } });
    await redraw(project, settings, set, ['home'], newJob());

    expect([read(setPath(set, 'home.svg')), readSet(project, set).failed]).toEqual([drawn, []]);
  });

  it("redraws with the set's prompt and clears its flips", async () => {
    const set = await run();
    fs.writeFileSync(path.join(project.styles, 'soft.md'), '# Changed\n\nDraw {subject} differently.\n');
    updateSet(project, set, (info) => ({ ...info, flips: { home: [[1, 2]] } }));
    await redraw(project, settings, set, ['home'], newJob());

    expect([stub.requests.at(-1)!.body['prompt'], readSet(project, set).flips]).toEqual([HOME_PROMPT, {}]);
  });

  it('runs one job at a time', async () => {
    stub.delayMs = 1500;
    ({ project } = makeProject({ icons: HOME_ONLY, targetFiles: [] }));
    const server = createServer(project, makeSettingsFile(settings));
    const port = await listen(server);
    const started = await request(port, 'POST', '/api/runs', { body: { styles: ['soft'], quality: 'medium' } });
    const set = ((await request(port, 'GET', '/api/state')).json['sets'] as { set: string }[])[0].set;
    const again = await request(port, 'POST', '/api/runs', { body: { styles: ['soft'], quality: 'medium' } });
    const redrawn = await request(port, 'POST', '/api/redraw', { body: { set, stems: ['home'] } });
    // let the job finish, so its browser closes before the server does
    while (((await request(port, 'GET', '/api/state')).json['job'] as { running: boolean }).running) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    await close(server);

    expect([started.status, again.status, redrawn.status]).toEqual([200, 409, 409]);
  });
});

describe('describe', () => {
  it('writes a subject from a drawing', async () => {
    const subject = await describeDrawing(settings, path.join(FIXTURES, 'set', 'home.svg'), 'home', 'a house');
    const sent = stub.requests[0];
    const content = (
      sent.body['messages'] as { content: { type: string; text?: string; image_url?: { url: string } }[] }[]
    )[0].content;

    expect([
      sent.endpoint,
      sent.body['model'],
      content[0].text?.includes('"home"') && content[0].text.includes('a house'),
      content[1].image_url?.url.startsWith('data:image/png;base64,'),
      subject
    ]).toEqual(['chat', 'chat-model', true, true, 'a house with a door']);
  });
});
