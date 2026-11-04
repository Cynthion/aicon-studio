import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Browser } from 'playwright';
import { PNG } from 'pngjs';
import * as potrace from 'potrace';
import { isDrawn, readConfig, type Config, type Project, type Rotated } from './project.ts';
import type { Settings } from './settings.ts';

// Draws candidate icon sets. A style is a prompt with `{subject}` in <project>/styles/<style>.md; aicon-studio.json names the icons.
// A run draws every icon once per chosen style into its own set, <project>/runs/<yyyy-mm-dd-hhmm>/<style>/: _run.json, and
// <stem>.svg and <stem>-filled.svg of each icon as soon as it is drawn; an icon not drawn has no file. The target is never
// written. Only outlines are drawn: prompt -> image model (OpenAI-compatible) -> PNG -> potrace -> one path, <stem>.svg.
// <stem>-filled.svg is derived from the rasterized outline (fillMask), so both have the same shape. A referenced icon,
// <project>/references/<stem>.svg, is sent as reference image (images/edits), so its drawing keeps that composition. describe
// writes a subject from a drawing with the describe model, a chat model with image input (chat/completions); rephrase has it
// rephrase a style or a subject for a reason. A failed drawing records its cause and the words of the endpoint in the set, so
// whatever the endpoint, the studio can say what happened and what to do.
// Reference: .documentation/tech/pipeline.md.

export interface Style {
  name: string;
  prompt: string;
}
/** Why a drawing failed, whatever the endpoint: `safety` and `other` fail its icon, the rest stop its job. */
export type Cause = 'safety' | 'other' | 'quota' | 'settings' | 'unavailable';
export interface Failure {
  cause: Cause;
  /** The words of the endpoint, or of the studio when the endpoint gave none. */
  message: string;
}
/** One stem to draw into a set. */
export interface Work {
  set: string;
  stem: string;
}
/** _run.json of a set, `<run>/<style>`. */
export interface SetInfo {
  run: string;
  style: string;
  imageModel: string;
  quality: string;
  prompt: string;
  icons: { stem: string; subject: string; referenced: boolean }[];
  /** Stems that were never drawn; they have no file in the set. */
  failed: string[];
  /** Per stem, why its last drawing failed; a drawing clears it. A failed redraw keeps its drawing, so its stem is not in `failed`. */
  failures: Record<string, Failure>;
  /** Per stem, points in viewBox units whose fill region is switched between filled and white. */
  flips: Record<string, [number, number][]>;
}
/** The progress of a drawing job, read by the studio while it runs. */
export interface Job {
  total: number;
  done: number;
  failed: string[];
  drawing: string[];
  sets: string[];
  /** Set by a stop: no new drawing starts, and no request is tried again. */
  stopped: boolean;
  /** Until when, in epoch milliseconds, a rate limit holds every request of the job back. */
  waitingUntil?: number;
  /** Why the job stopped itself: the endpoint refused every drawing, not one. */
  halted?: Failure;
}
interface Path {
  d: string;
  viewBox: string;
}

/** The record of a set, beside its SVG files. */
export const RUN_FILE = '_run.json';
const CONCURRENCY = 4;
const TRACE = { threshold: 140, turdSize: 40, optTolerance: 0.4, alphaMax: 1 };
/** Empty space on each side, in units of a 24-unit icon. */
const PADDING = 2;
/** Side of the square, in pixels, an outline is rasterized to for its fill. */
const RASTER = 1024;
/** Brush gaps up to twice this many pixels are bridged before an outline is filled. */
const GAP = 12;
/** Ink deeper inside the silhouette than this many stroke widths turns white in the fill. */
const DEPTH = 1.5;
/** The ridge of the ink, ranked by half-width, that names the stroke width: the thicker strokes. */
const STROKE_PERCENTILE = 0.9;
/** A fill below this many times its ink area enclosed next to nothing: an open contour. */
const UNFILLED = 1.1;
/** What an endpoint says, in its error code or message, about a prompt its safety filter refused. */
const SAFETY = /moderation|safety|content.?(filter|policy)|responsible.?ai/i;
/** An error code naming a spent quota or a billing problem; a rate limit may link a quota increase in its message. */
const QUOTA = /quota|billing/i;
/** Tries of a request that gets no answer or a server error, and of one the safety filter blocks. */
const TRIES = 5;
const SAFETY_TRIES = 2;
export const REFERENCE_PROMPT =
  'The attached image is a drawing of this subject. Keep its composition, pose and parts, and redraw it in the style described above.';
const INCOMPLETE = 'Enter the base URL, API key and models in Settings';

export const newJob = (): Job => ({ total: 0, done: 0, failed: [], drawing: [], sets: [], stopped: false });

/** Thrown instead of a request once the job is stopped; the icon is neither drawn nor failed. */
class Stopped extends Error {}
/** Thrown when a request fails its icon. */
class Failed extends Error {
  readonly failure: Failure;
  constructor(failure: Failure) {
    super(failure.message);
    this.failure = failure;
  }
}
/** Thrown when the endpoint refuses every drawing, not one: the job stops. */
class Halted extends Failed {}
export const readStyles = (project: Project): Style[] =>
  fs.existsSync(project.styles)
    ? fs
        .readdirSync(project.styles)
        .filter((file) => file.endsWith('.md'))
        .map((file) => ({
          name: file.slice(0, -3),
          prompt: fs.readFileSync(path.join(project.styles, file), 'utf8').trim()
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
export const isReferenced = (project: Project, stem: string): boolean =>
  fs.existsSync(path.join(project.references, `${stem}.svg`));

/** Every set, `<run>/<style>`, newest run first. */
export const sets = (project: Project): string[] =>
  fs.existsSync(project.runs)
    ? fs
        .readdirSync(project.runs, { withFileTypes: true })
        .filter((run) => run.isDirectory())
        .flatMap((run) =>
          fs
            .readdirSync(path.join(project.runs, run.name), { withFileTypes: true })
            .filter((style) => fs.existsSync(path.join(project.runs, run.name, style.name, RUN_FILE)))
            .map((style) => `${run.name}/${style.name}`)
        )
        .sort()
        .reverse()
    : [];
/** The directory of a set, `<run>/<style>`. */
export const setDir = (project: Project, set: string): string => path.join(project.runs, ...set.split('/'));
export const readSet = (project: Project, set: string): SetInfo => {
  const info = JSON.parse(fs.readFileSync(path.join(setDir(project, set), RUN_FILE), 'utf8')) as SetInfo;
  // older sets record no failures
  return { ...info, failures: info.failures ?? {} };
};
/** Rewrites _run.json of a set; synchronous, so concurrent drawings never interleave. */
export const updateSet = (project: Project, set: string, change: (info: SetInfo) => SetInfo): void =>
  fs.writeFileSync(
    path.join(setDir(project, set), RUN_FILE),
    `${JSON.stringify(change(readSet(project, set)), null, 2)}\n`
  );

/** Local time as yyyy-mm-dd-hhmm. */
const runName = (now: Date): string => {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
};

/** A per-stem record without `stem`. */
const without = <T>(record: Record<string, T>, stem: string): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([s]) => s !== stem));

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** The OpenAI-compatible endpoint, without a trailing slash, and its key. */
const credentials = (settings: Settings, model: 'imageModel' | 'describeModel'): { base: string; key: string } => {
  if (!settings.baseUrl || !settings.apiKey || !settings[model]) {
    throw new Error(INCOMPLETE);
  }
  return { base: settings.baseUrl.replace(/\/$/, ''), key: settings.apiKey };
};

/** The error of an answer, under `error` or at its top level. */
interface ErrorAnswer {
  error?: { message?: string; code?: string };
  message?: string;
  code?: string;
}

/** The words of an endpoint's error, or the answer itself when it has none. */
const wordsOf = (status: number, answer: ErrorAnswer): string => {
  const error = answer.error ?? answer;
  return error.message ?? `${status} ${JSON.stringify(error).slice(0, 300)}`;
};

/** What a refused request means: a quota, a payment or the settings stop the job, a server error is tried again. */
const failureOf = (status: number, answer: ErrorAnswer): Failure => {
  const error = answer.error ?? answer;
  const message = wordsOf(status, answer);
  if (status === 402 || QUOTA.test(error.code ?? '')) {
    return { cause: 'quota', message };
  }
  if (status >= 500) {
    return { cause: 'unavailable', message };
  }
  if ([401, 403, 404].includes(status)) {
    return { cause: 'settings', message };
  }
  return { cause: SAFETY.test(JSON.stringify(answer)) ? 'safety' : 'other', message };
};

/** Waits while a rate limit holds the job back, in short steps, so that a stop ends the wait. */
const held = async (job: Pick<Job, 'stopped' | 'waitingUntil'>): Promise<void> => {
  while (!job.stopped && (job.waitingUntil ?? 0) > Date.now()) {
    await sleep(Math.min(250, job.waitingUntil! - Date.now()));
  }
};

/**
 * One image: from images/generations, or with a reference image from images/edits.
 * A rate limit holds every request of the job back as long as its retry-after asks, as often as it comes. No answer or a
 * server error is tried five times and a safety block twice; a quota, a payment, the settings and the fifth failed try
 * stop the job, any other client error fails the icon.
 */
const requestImage = async (
  settings: Settings,
  prompt: string,
  { imageModel, quality }: { imageModel: string; quality: string },
  job: Pick<Job, 'stopped' | 'waitingUntil'>,
  reference?: Buffer
): Promise<Buffer> => {
  const { base, key } = credentials(settings, 'imageModel');
  const fields = {
    model: imageModel,
    prompt,
    n: '1',
    size: '1024x1024',
    quality,
    background: 'transparent',
    output_format: 'png'
  };
  const request = (): RequestInit => {
    if (!reference) {
      return {
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, n: 1 })
      };
    }
    const form = new FormData();
    Object.entries(fields).forEach(([name, value]) => form.append(name, value));
    form.append('image[]', new Blob([new Uint8Array(reference)], { type: 'image/png' }), 'reference.png');
    return { headers: { Authorization: `Bearer ${key}` }, body: form };
  };
  const endpoint = reference ? 'images/edits' : 'images/generations';
  // the tries that count: a rate limit is the endpoint holding back, not a failure
  for (let tries = 1; ; tries++) {
    await held(job);
    if (job.stopped) {
      throw new Stopped();
    }
    let failure: Failure;
    try {
      const res = await fetch(`${base}/${endpoint}`, {
        method: 'POST',
        ...request(),
        signal: AbortSignal.timeout(180_000)
      });
      const json = (await res.json().catch(() => ({}))) as ErrorAnswer & { data?: { b64_json?: string }[] };
      const image = json.data?.[0]?.b64_json;
      if (image !== undefined) {
        return Buffer.from(image, 'base64');
      }
      // an answer without an image fails the icon, whatever its status
      failure = res.ok ? { cause: 'other', message: wordsOf(res.status, json) } : failureOf(res.status, json);
      if (res.status === 429 && failure.cause !== 'quota') {
        // the rate limit names its own wait in seconds
        const wait = (Number(res.headers.get('retry-after')) || 60) * 1000 + 1000;
        job.waitingUntil = Math.max(job.waitingUntil ?? 0, Date.now() + wait);
        tries--;
        continue;
      }
    } catch (e) {
      failure = { cause: 'unavailable', message: String((e as { cause?: { code?: string } }).cause?.code ?? e) };
    }
    if (failure.cause === 'other' || (failure.cause === 'safety' && tries === SAFETY_TRIES)) {
      throw new Failed(failure);
    }
    if (failure.cause !== 'safety' && (failure.cause !== 'unavailable' || tries === TRIES)) {
      throw new Halted(failure);
    }
    await sleep(tries * 5000);
  }
};

const trace = (png: Buffer): Promise<string> =>
  new Promise((resolve, reject) =>
    potrace.trace(png, TRACE, (error: Error | null, svg: string) => (error ? reject(error) : resolve(svg)))
  );

const round = (n: number): number => Math.round(n * 10) / 10;

/** The numbers of a path as x, y pairs: potrace writes absolute M, L and C commands only. */
const points = (d: string): [number, number][] => {
  const n = (d.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  return Array.from({ length: n.length / 2 }, (_, i) => [n[2 * i], n[2 * i + 1]]);
};

/** The traced drawing as one path with one decimal, in a square viewBox around its bounds plus PADDING. */
const toPath = (traced: string): Path => {
  const d = [...traced.matchAll(/ d="([^"]+)"/g)]
    .map((m) => m[1])
    .join(' ')
    .replace(/\d+\.\d+/g, (n) => String(round(Number(n))));
  const xs = points(d).map(([x]) => x);
  const ys = points(d).map(([, y]) => y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const side = (Math.max(maxX - minX, maxY - minY) * 24) / (24 - 2 * PADDING);
  const viewBox = [(minX + maxX - side) / 2, (minY + maxY - side) / 2, side, side].map(round).join(' ');
  return { d, viewBox };
};

/**
 * Chamfer (3-4) distance of every pixel of `mask` to the nearest pixel outside it, in pixels; 0 outside the mask.
 * Beyond the canvas counts as inside the mask when `edgeInside`, else as outside.
 */
const distance = (mask: Uint8Array, size: number, edgeInside: boolean): Float32Array => {
  const far = 1e9;
  const d = Float32Array.from(mask, (m) => (m ? far : 0));
  const at = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= size || y >= size ? (edgeInside ? far : 0) : d[y * size + x];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (d[y * size + x]) {
        d[y * size + x] = Math.min(
          d[y * size + x],
          at(x - 1, y) + 3,
          at(x, y - 1) + 3,
          at(x - 1, y - 1) + 4,
          at(x + 1, y - 1) + 4
        );
      }
    }
  }
  for (let y = size - 1; y >= 0; y--) {
    for (let x = size - 1; x >= 0; x--) {
      if (d[y * size + x]) {
        d[y * size + x] = Math.min(
          d[y * size + x],
          at(x + 1, y) + 3,
          at(x, y + 1) + 3,
          at(x + 1, y + 1) + 4,
          at(x - 1, y + 1) + 4
        );
      }
    }
  }
  return d.map((v) => v / 3);
};

/** The pixels of `mask` 4-connected to any of the `seeds`, and whether they reach the canvas border. */
const component = (mask: Uint8Array, size: number, seeds: number[]): { pixels: Uint8Array; border: boolean } => {
  const pixels = new Uint8Array(mask.length);
  let border = false;
  const stack = [...seeds];
  while (stack.length) {
    const i = stack.pop()!;
    if (pixels[i] || !mask[i]) {
      continue;
    }
    pixels[i] = 1;
    const [x, y] = [i % size, Math.floor(i / size)];
    border ||= x === 0 || y === 0 || x === size - 1 || y === size - 1;
    if (x > 0) {
      stack.push(i - 1);
    }
    if (x < size - 1) {
      stack.push(i + 1);
    }
    if (y > 0) {
      stack.push(i - size);
    }
    if (y < size - 1) {
      stack.push(i + size);
    }
  }
  return { pixels, border };
};

/**
 * The filled version of a rasterized outline, black on white: its silhouette, with brush gaps up to 2 * GAP pixels bridged
 * and every hole filled, minus the ink lying deeper inside than the contour stroke, so interior lines and dots turn white,
 * even where they touch the contour. Each flip, a pixel, switches its region between filled and white: an enclosed area
 * or an interior line. `ratio` is filled area / ink area: close to 1 means the outline enclosed nothing.
 */
export const fillMask = (png: Buffer, flips: [number, number][] = []): { png: Buffer; ratio: number } => {
  const image = PNG.sync.read(png);
  const size = image.width;
  const ink = new Uint8Array(size * size);
  for (let i = 0; i < ink.length; i++) {
    const [r, g, b, a] = image.data.subarray(4 * i, 4 * i + 4) as unknown as [number, number, number, number];
    const luminance = ((0.2126 * r + 0.7152 * g + 0.0722 * b) * a) / 255 + 255 * (1 - a / 255);
    ink[i] = luminance < TRACE.threshold ? 1 : 0;
  }
  const toInk = distance(
    ink.map((v) => 1 - v),
    size,
    true
  );
  const dilated = Uint8Array.from(toInk, (v) => (v <= GAP ? 1 : 0));
  const open = Uint8Array.from(distance(dilated, size, false), (v) => (v > GAP ? 0 : 1));
  const border = [...Array(size).keys()].flatMap((i) => [i, (size - 1) * size + i, i * size, i * size + size - 1]);
  const outside = component(open, size, border).pixels;
  const depth = distance(
    outside.map((v) => 1 - v),
    size,
    false
  );
  // the stroke width: twice the half-width reached by the thicker strokes, at the ridges of the ink
  const half = distance(ink, size, false);
  const ridges = [...half.keys()]
    .filter(
      (i) =>
        half[i] >= 1 &&
        half[i] >= half[i - 1] &&
        half[i] >= half[i + 1] &&
        half[i] >= half[i - size] &&
        half[i] >= half[i + size]
    )
    .map((i) => half[i])
    .sort((a, b) => a - b);
  const stroke = 2 * (ridges[Math.floor(ridges.length * STROKE_PERCENTILE)] ?? 0);
  const white = Uint8Array.from(ink, (v, i) => (v && depth[i] > DEPTH * stroke ? 1 : 0));
  const black = Uint8Array.from(outside, (v, i) => (!v && !white[i] ? 1 : 0));
  for (const [x, y] of flips.map(([fx, fy]) => [Math.floor(fx), Math.floor(fy)] as [number, number])) {
    const seed = y * size + x;
    const mask = white[seed] ? white : open[seed] ? open : undefined;
    const region = x >= 0 && y >= 0 && x < size && y < size && mask ? component(mask, size, [seed]) : undefined;
    if (region && !region.border) {
      region.pixels.forEach((v, i) => (black[i] ^= v));
    }
  }
  const out = new PNG({ width: size, height: size });
  black.forEach((v, i) => out.data.set(v ? [0, 0, 0, 255] : [255, 255, 255, 255], 4 * i));
  return {
    png: PNG.sync.write(out),
    ratio:
      black.reduce((s, v) => s + v, 0) /
      Math.max(
        1,
        ink.reduce((s, v) => s + v, 0)
      )
  };
};

const svg = ({ d, viewBox }: Path, transform = ''): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path${transform} fill-rule="evenodd" d="${d}"/></svg>\n`;

/** Playwright's Chromium, which rasterizes SVG. */
const launch = async (): Promise<Browser> => (await import('playwright')).chromium.launch();

/** SVG markup, black on white, `side` pixels wide in the centre of a RASTER square. */
const rasterize = async (browser: Browser, markup: string, side: number): Promise<Buffer> => {
  const page = await browser.newPage({ viewport: { width: RASTER, height: RASTER } });
  await page.setContent(
    `<body style="margin:0;height:${RASTER}px;display:grid;place-items:center;background:#fff">${markup.replace(/<svg\b[^>]*>/, (tag) => tag.replace(/\s(width|height)="[^"]*"/g, '').replace('<svg', `<svg width="${side}" height="${side}"`))}</body>`
  );
  const png = await page.screenshot();
  await page.close();
  return png;
};

/** The describe model's answer to one message, through chat/completions. */
const chat = async (settings: Settings, content: unknown[]): Promise<string> => {
  const { base, key } = credentials(settings, 'describeModel');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: settings.describeModel, messages: [{ role: 'user', content }] }),
    signal: AbortSignal.timeout(120_000)
  });
  const json = (await res.json().catch(() => ({}))) as ErrorAnswer & {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!res.ok || !text) {
    throw new Error(wordsOf(res.status, json));
  }
  return text;
};

/** A subject written from a drawing: what the icon stands for and what it shows, so every style draws that composition. */
export const describe = async (settings: Settings, file: string, stem: string, subject: string): Promise<string> => {
  const browser = await launch();
  const png = await rasterize(browser, fs.readFileSync(file, 'utf8'), 820).finally(() => browser.close());
  const prompt = [
    `The attached image is the UI icon "${stem}" of an app. Its current subject is: ${subject}.`,
    'Write a new subject for it. A style prompt inserts the subject into "Create a minimal UI icon of {subject} in … style", and an image model draws it in several styles.',
    'Start with what the icon stands for, then describe what the drawing shows: its objects, their parts, arrangement and orientation, so the model draws the same composition.',
    'Describe content only, never style: no line weight, outline, fill, colour, stroke ends, brush or 3D.',
    'Answer with the subject only: one lowercase noun phrase of at most 40 words, without quotes and without a final full stop.'
  ].join('\n');
  return chat(settings, [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: `data:image/png;base64,${png.toString('base64')}`, detail: 'low' } }
  ]);
};

/** A style rephrased by the describe model for a reason. */
export const rephrase = async (settings: Settings, prompt: string, reason: string): Promise<string> => {
  const text = [
    'The text between the --- lines is a style prompt. An image model draws UI icons from it, with {subject} replaced by each icon.',
    `Rephrase it for this reason: ${reason}`,
    'Keep the look, the structure and the rules it describes, and change only what the reason asks for.',
    'Keep the # heading and {subject} as they are.',
    'Answer with the rephrased prompt only, without a comment and without a code fence.',
    '---',
    prompt,
    '---'
  ].join('\n');
  return chat(settings, [{ type: 'text', text }]);
};

/** A subject rephrased by the describe model for a reason; `prompt` is the style it was drawn in, if any. */
export const rephraseSubject = async (
  settings: Settings,
  subject: string,
  reason: string,
  prompt?: string
): Promise<string> => {
  const text = [
    `An image model draws a UI icon of an app from a style prompt, with {subject} replaced by its subject: ${subject}.`,
    `Rephrase the subject for this reason: ${reason}`,
    'Keep the symbol it names and what it stands for, and change only what the reason asks for.',
    'Describe content only, never style: no line weight, outline, fill, colour, stroke ends, brush or 3D.',
    'Answer with the subject only: one lowercase noun phrase of at most 40 words, without quotes and without a final full stop.',
    ...(prompt ? ['The style prompt it was drawn with is between the --- lines.', '---', prompt, '---'] : [])
  ].join('\n');
  return chat(settings, [{ type: 'text', text }]);
};

/** The filled version of an outline SVG: its rasterized fill, flips in viewBox units, traced back into the outline's viewBox. */
const filledOf = async (
  browser: Browser,
  outline: string,
  flips: [number, number][]
): Promise<{ markup: string; ratio: number }> => {
  const viewBox = /viewBox="([^"]+)"/.exec(outline)?.[1] ?? '0 0 24 24';
  const [x, y, side] = viewBox.split(' ').map(Number) as [number, number, number];
  const pixels = flips.map(([fx, fy]): [number, number] => [((fx - x) * RASTER) / side, ((fy - y) * RASTER) / side]);
  const { png, ratio } = fillMask(await rasterize(browser, outline, RASTER), pixels);
  let n = 0;
  const d = [...(await trace(png)).matchAll(/ d="([^"]+)"/g)]
    .map((m) => m[1])
    .join(' ')
    .replace(/\d+(\.\d+)?/g, (v) => String(round((n++ % 2 ? y : x) + (Number(v) * side) / RASTER)));
  return { markup: svg({ d, viewBox }), ratio };
};

/** An icon file rotated about the centre of its square viewBox. */
const rotated = (file: string, degrees: number): string => {
  const markup = fs.readFileSync(file, 'utf8');
  const [x, y, side] = (/viewBox="([^"]+)"/.exec(markup)?.[1] ?? '0 0 24 24').split(' ').map(Number) as [
    number,
    number,
    number
  ];
  return markup.replace('<path', `<path transform="rotate(${degrees} ${round(x + side / 2)} ${round(y + side / 2)})"`);
};

/** Both files of a rotation in a set, from the outline and fill of its `from` icon; nothing while the set has no outline of it. */
export const writeRotation = (project: Project, set: string, rotation: Rotated): void => {
  const file = (s: string): string => path.join(setDir(project, set), `${s}.svg`);
  if (!fs.existsSync(file(rotation.from))) {
    return;
  }
  fs.writeFileSync(file(rotation.stem), rotated(file(rotation.from), rotation.rotate));
  fs.writeFileSync(file(`${rotation.stem}-filled`), rotated(file(`${rotation.from}-filled`), rotation.rotate));
};

/** <stem>-filled.svg of a drawn stem and both files of every rotation of it, from <stem>.svg and the set's flips. */
const derive = async (
  project: Project,
  browser: Browser,
  set: string,
  stem: string,
  config: Config
): Promise<number> => {
  const file = (s: string): string => path.join(setDir(project, set), `${s}.svg`);
  const { markup, ratio } = await filledOf(
    browser,
    fs.readFileSync(file(stem), 'utf8'),
    readSet(project, set).flips[stem] ?? []
  );
  fs.writeFileSync(file(`${stem}-filled`), markup);
  for (const rotation of config.icons.filter((icon): icon is Rotated => !isDrawn(icon) && icon.from === stem)) {
    writeRotation(project, set, rotation);
  }
  return ratio;
};

/** Draws each stem into its set, CONCURRENCY at a time. A failed redraw keeps the last drawing; a stem never drawn is listed in `failed`; `failures` says why of both. */
const draw = async (project: Project, settings: Settings, work: Work[], job: Job): Promise<void> => {
  const config = readConfig(project);
  const subjects = new Map(config.icons.filter(isDrawn).map((icon) => [icon.stem, icon.subject]));
  job.total += work.length;
  const browser = await launch();
  const queue = [...work];
  const worker = async (): Promise<void> => {
    for (let item = queue.shift(); item && !job.stopped; item = queue.shift()) {
      const { set, stem } = item;
      const name = `${set}/${stem}`;
      job.drawing.push(name);
      try {
        const info = readSet(project, set);
        const subject = subjects.get(stem)!;
        const prompt = info.prompt.replaceAll('{subject}', subject);
        const reference = path.join(project.references, `${stem}.svg`);
        const referenced = fs.existsSync(reference);
        const png = referenced
          ? await requestImage(
              settings,
              `${prompt}\n\n${REFERENCE_PROMPT}`,
              info,
              job,
              await rasterize(browser, fs.readFileSync(reference, 'utf8'), 820)
            )
          : await requestImage(settings, prompt, info, job);
        fs.writeFileSync(path.join(setDir(project, set), `${stem}.svg`), svg(toPath(await trace(png))));
        // a new drawing: the flips of the old one point at other regions
        updateSet(project, set, (i) => ({
          ...i,
          icons: [...i.icons.filter((icon) => icon.stem !== stem), { stem, subject, referenced }],
          failed: i.failed.filter((s) => s !== stem),
          failures: without(i.failures, stem),
          flips: without(i.flips, stem)
        }));
        const ratio = await derive(project, browser, set, stem, config);
        console.log(`drew ${name}${ratio < UNFILLED ? ', its fill enclosed next to nothing: open contour?' : ''}`);
        job.done++;
      } catch (e) {
        // a stopped icon is neither drawn nor failed, so it is not done
        if (e instanceof Stopped) {
          console.log(`stopped ${name}`);
          continue;
        }
        if (e instanceof Halted) {
          job.halted ??= e.failure;
          job.stopped = true;
          console.error(`stopped the job at ${name}: ${e.failure.message}`);
          continue;
        }
        const failure = e instanceof Failed ? e.failure : { cause: 'other' as const, message: (e as Error).message };
        job.failed.push(`${name}: ${failure.message}`);
        const kept = fs.existsSync(path.join(setDir(project, set), `${stem}.svg`));
        updateSet(project, set, (i) => ({
          ...i,
          failed: kept ? i.failed : [...new Set([...i.failed, stem])],
          failures: { ...i.failures, [stem]: failure }
        }));
        console.error(`failed ${name}: ${failure.message}`);
        job.done++;
      } finally {
        job.drawing = job.drawing.filter((n) => n !== name);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await browser.close();
};

/** A new run: one set per style, every drawn icon of aicon-studio.json or the chosen `stems`, the referenced ones from their reference. */
export const startRun = async (
  project: Project,
  settings: Settings,
  styles: string[],
  quality: string,
  job: Job,
  stems?: string[]
): Promise<void> => {
  const config = readConfig(project);
  const chosen = readStyles(project).filter((style) => styles.includes(style.name));
  if (!styles.length || chosen.length !== styles.length) {
    throw new Error(`choose known styles, got: ${styles.join(', ') || 'none'}`);
  }
  const run = runName(new Date());
  const sets = chosen.map((style) => `${run}/${style.name}`);
  const taken = sets.find((set) => fs.existsSync(setDir(project, set)));
  if (taken) {
    throw new Error(`${taken} exists, wait a minute and run again`);
  }
  const drawn = config.icons.filter(isDrawn).filter((icon) => !stems || stems.includes(icon.stem));
  if (stems && (!stems.length || drawn.length !== stems.length)) {
    throw new Error(`choose drawn stems of aicon-studio.json, got: ${stems.join(', ') || 'none'}`);
  }
  chosen.forEach((style, i) => {
    fs.mkdirSync(setDir(project, sets[i]), { recursive: true });
    const info: SetInfo = {
      run,
      style: style.name,
      imageModel: settings.imageModel,
      quality,
      prompt: style.prompt,
      icons: drawn.map((icon) => ({
        stem: icon.stem,
        subject: icon.subject,
        referenced: isReferenced(project, icon.stem)
      })),
      failed: [],
      failures: {},
      flips: {}
    };
    fs.writeFileSync(path.join(setDir(project, sets[i]), RUN_FILE), `${JSON.stringify(info, null, 2)}\n`);
  });
  job.sets.push(...sets);
  await draw(
    project,
    settings,
    sets.flatMap((set) => drawn.map((icon) => ({ set, stem: icon.stem }))),
    job
  );
};

/** Draws stems again into their sets, with each set's own prompt, model and quality, and the current references. */
export const redraw = async (project: Project, settings: Settings, work: Work[], job: Job): Promise<void> => {
  const drawn = readConfig(project).icons.filter(isDrawn);
  if (!work.length || work.some(({ stem }) => !drawn.some((icon) => icon.stem === stem))) {
    throw new Error(
      `choose drawn stems of aicon-studio.json, got: ${work.map(({ stem }) => stem).join(', ') || 'none'}`
    );
  }
  job.sets.push(...new Set(work.map(({ set }) => set)));
  await draw(project, settings, work, job);
};

/** Derives the fills of a set's drawn stems again, all or the given ones, e.g. after their flips changed. */
export const refill = async (project: Project, set: string, stems?: string[]): Promise<void> => {
  const config = readConfig(project);
  const info = readSet(project, set);
  const browser = await launch();
  try {
    for (const { stem } of info.icons.filter(
      (i) => !info.failed.includes(i.stem) && (!stems || stems.includes(i.stem))
    )) {
      const ratio = await derive(project, browser, set, stem, config);
      console.log(`filled ${set}/${stem}${ratio < UNFILLED ? ', it enclosed next to nothing: open contour?' : ''}`);
    }
  } finally {
    await browser.close();
  }
};
