import type { Icon, Job, SetEntry, State } from './api.model';
import {
  cellState,
  chosenStems,
  columns,
  costBreakdown,
  costLabel,
  fileUrl,
  flowSteps,
  ICONS_COLUMN,
  jobText,
  missingStems,
  nextStep,
  priceError,
  promptOf,
  reorder,
  runSummary,
  stemError,
  styleNameError,
  stylePromptError
} from './studio.helpers';
import type { Column } from './studio.model';

const ICONS: Icon[] = [
  { stem: 'home', subject: 'a house' },
  { stem: 'search', subject: 'a magnifying glass' },
  { stem: 'chevron-right', subject: 'a chevron pointing right' },
  { stem: 'chevron-down', from: 'chevron-right', rotate: 90 }
];
const A = '2026-10-26-1200/soft';
const B = '2026-10-27-0900/sharp';
const C = '2026-10-28-1000/soft';
const GEAR: Icon = { stem: 'gear', subject: 'a gear' };

const set = (id: string, files: string[] = ['home', 'home-filled'], failed: string[] = []): SetEntry => {
  const [run = '', style = ''] = id.split('/');
  return {
    set: id,
    info: {
      run,
      style,
      imageModel: 'img',
      quality: 'medium',
      prompt: '# Soft\n{subject}',
      icons: [],
      failed,
      flips: {}
    },
    files: Object.fromEntries(files.map((file, i) => [file, i + 1]))
  };
};

/** The sets newest first, as GET /api/state lists them. */
const state = (patch: Partial<State> = {}): State => ({
  project: '/p',
  config: { target: './icons', quality: 'medium', icons: ICONS },
  target: './icons',
  styles: [{ name: 'soft', prompt: '# Soft\n{subject}' }],
  referencePrompt: 'Keep it.',
  icons: {},
  references: {},
  referencedIn: {},
  sets: [set(B), set(A)],
  settings: { baseUrl: 'http://127.0.0.1:1/v1', imageModel: 'img', describeModel: 'chat', hasApiKey: true },
  ...patch
});
const job = (patch: Partial<Job> = {}): Job => ({
  kind: 'run',
  running: true,
  total: 4,
  done: 0,
  failed: [],
  drawing: [],
  sets: [],
  stopped: false,
  ...patch
});
const ids = (s: State, order: string[]): string[] => columns(s, order).map((column) => column.id);
const column = (s: State, id: string): Column => columns(s, []).find((c) => c.id === id)!;
const icon = (stem: string): Icon => ICONS.find((i) => i.stem === stem)!;

describe('columns', () => {
  it('puts the current icons first, then every set newest run first', () => {
    expect(ids(state(), [])).toEqual([ICONS_COLUMN, B, A]);
  });

  it('keeps the saved order of the sets', () => {
    expect(ids(state(), [A, B])).toEqual([ICONS_COLUMN, A, B]);
  });

  it('puts a set missing from the saved order first, newest first', () => {
    expect(ids(state({ sets: [set(C), set(B), set(A)] }), [A, B])).toEqual([ICONS_COLUMN, C, A, B]);
  });

  it('ignores a saved set that no longer exists', () => {
    expect(ids(state(), ['2020-01-01-0000/gone', A, B])).toEqual([ICONS_COLUMN, A, B]);
  });
});

describe('reorder', () => {
  it('moves a visible column and keeps hidden ones after the visible', () => {
    expect(reorder([A, B, C], ['2026-10-25-0800/flat'], 2, 0)).toEqual([C, A, B, '2026-10-25-0800/flat']);
  });
});

describe('cellState', () => {
  it('marks a cell drawing while the job draws it', () => {
    expect(cellState(column(state(), B), icon('home'), job({ drawing: [`${B}/home`], sets: [B] }))).toBe('drawing');
  });

  it('marks a cell failed when the set lists the stem', () => {
    const s = state({ sets: [set(B, [], ['home']), set(A)] });

    expect(cellState(column(s, B), icon('home'), undefined)).toBe('failed');
  });

  it('marks a cell pending while the job writes the set and the file is missing', () => {
    expect(cellState(column(state(), B), icon('search'), job({ sets: [B] }))).toBe('pending');
  });

  it('gives a rotation the state of its from icon', () => {
    const s = state({ sets: [set(B, ['home'], ['chevron-right']), set(A)] });

    expect(cellState(column(s, B), icon('chevron-down'), undefined)).toBe('failed');
  });

  it('marks a set cell without a file and without a job not drawn', () => {
    expect(cellState(column(state(), B), GEAR, undefined)).toBe('not drawn');
  });

  it('gives a current-icons cell without a file no state', () => {
    expect(cellState(column(state(), ICONS_COLUMN), GEAR, undefined)).toBe('');
  });
});

describe('costLabel', () => {
  const priced = (patch: Partial<State> = {}): State =>
    state({ settings: { ...state().settings, pricePlain: 0.04, priceReferenced: 0.08 }, ...patch });

  it('is empty without both prices', () => {
    const s = state({ settings: { ...state().settings, pricePlain: 0.04 } });

    expect(costLabel(s, ['home'])).toBe('');
  });

  it('prices referenced stems at the referenced price', () => {
    expect(costLabel(priced({ references: { home: 1 } }), ['home', 'search'])).toBe(' (≈ $0.12)');
  });

  it('shows three decimals under ten cents', () => {
    expect(costLabel(priced(), ['search'])).toBe(' (≈ $0.040)');
  });
});

describe('fileUrl', () => {
  it('versions a file by its modification time', () => {
    expect(fileUrl(column(state(), A), 'home')).toBe('/files/sets/2026-10-26-1200/soft/home.svg?v=1');
  });

  it('has no URL for a file the column lacks', () => {
    expect(fileUrl(column(state(), A), 'gear')).toBeUndefined();
  });
});

describe('promptOf', () => {
  it('replaces every {subject} with the subject of the icon', () => {
    expect(promptOf(state(), '# Soft\n{subject}, {subject}', 'search')).toBe(
      '# Soft\na magnifying glass, a magnifying glass'
    );
  });

  it('appends the reference prompt for a referenced stem', () => {
    expect(promptOf(state({ references: { home: 1 } }), '# Soft\n{subject}', 'home')).toBe(
      '# Soft\na house\n\nKeep it.'
    );
  });
});

describe('jobText', () => {
  it('counts the drawings of a running job and its failures', () => {
    expect(jobText(job({ done: 3, total: 8, failed: ['a/home: x'] }))).toBe('Drawing 3/8 · 1 failed');
  });

  it('names the drawings a stopping job waits for', () => {
    expect([
      jobText(job({ stopped: true, drawing: ['a/home', 'a/search'] })),
      jobText(job({ stopped: true, drawing: ['a/home'] }))
    ]).toEqual(['Stopping: 2 drawings finish', 'Stopping: 1 drawing finishes']);
  });

  it('counts what a stopped job drew and left undrawn', () => {
    expect(jobText(job({ running: false, stopped: true, done: 5, total: 8, failed: ['a/home: x'] }))).toBe(
      'run stopped: 4 drawn, 3 not drawn'
    );
  });

  it('shows the error that ended a job', () => {
    expect(jobText(job({ running: false, error: 'boom' }))).toBe('run stopped: boom');
  });

  it('counts what a finished job drew and its failures', () => {
    expect([
      jobText(job({ running: false, done: 8, total: 8, failed: ['a/home: x'] })),
      jobText(job({ kind: 'redraw', running: false, done: 2, total: 2 }))
    ]).toEqual(['run done: 7 drawn, 1 failed', 'redraw done: 2 drawn']);
  });
});

describe('flowSteps', () => {
  const firstSteps = state({
    config: { target: './icons', quality: 'medium', icons: [icon('home')] },
    styles: [],
    sets: []
  });
  const done = (s: State): Record<string, boolean> =>
    Object.fromEntries(flowSteps(s).map((step) => [step.key, step.done]));

  it('marks Settings done only with base URL, key and both models', () => {
    const complete = state();
    const keyless = state({ settings: { ...complete.settings, hasApiKey: false } });
    const modelless = state({ settings: { ...complete.settings, describeModel: '' } });

    expect([done(complete)['settings'], done(keyless)['settings'], done(modelless)['settings']]).toEqual([
      true,
      false,
      false
    ]);
  });

  it('marks Icons, Styles and First run done by non-empty icons, styles, sets', () => {
    expect(done(firstSteps)).toEqual({ settings: true, icons: true, styles: false, run: false });
  });

  it('names the first open step as next', () => {
    expect(nextStep(flowSteps(firstSteps))?.key).toBe('styles');
  });

  it('has no next step when every step is done', () => {
    expect(nextStep(flowSteps(state()))).toBeUndefined();
  });
});

describe('style rules', () => {
  const styles = state().styles;

  it('refuses a style name outside lowercase letters, digits and dashes', () => {
    expect([styleNameError('Soft', styles, true), styleNameError('soft-2', styles, true)]).toEqual([
      expect.any(String),
      undefined
    ]);
  });

  it('refuses an existing name for a new style', () => {
    expect([styleNameError('soft', styles, true), styleNameError('soft', styles, false)]).toEqual([
      expect.any(String),
      undefined
    ]);
  });

  it('refuses a prompt without {subject} or without a # heading', () => {
    expect([
      stylePromptError('# Soft\n\nA drawing.'),
      stylePromptError('Soft: {subject}'),
      stylePromptError('# Soft\n\nA drawing of {subject}.')
    ]).toEqual([expect.any(String), expect.any(String), undefined]);
  });
});

describe('missingStems', () => {
  it('lists the drawn icons a set lacks, failed ones included, rotations left out', () => {
    const s = state({ sets: [set(B, ['home', 'home-filled'], ['search']), set(A)] });

    expect(missingStems(s, column(s, B))).toEqual(['search', 'chevron-right']);
  });
});

describe('runSummary', () => {
  it('sums a test run over the chosen icons only', () => {
    const s = state({
      settings: { ...state().settings, pricePlain: 0.04, priceReferenced: 0.06 },
      references: { home: 1 }
    });
    const summary = runSummary(s, ['home', 'search'], 2);

    expect([summary.images, summary.referenced, summary.cost]).toEqual([4, 2, expect.closeTo(0.2)]);
  });
});

describe('chosenStems', () => {
  it('forgets remembered chosen icons that are no drawn icon any more', () => {
    expect(chosenStems(state(), ['home', 'gone', 'chevron-down'])).toEqual(['home']);
  });
});

describe('stemError', () => {
  it('refuses an icon stem outside letters, digits, dashes, underscores, or one that exists', () => {
    expect([stemError('a b', ICONS), stemError('home', ICONS), stemError('gear_2', ICONS)]).toEqual([
      expect.any(String),
      expect.any(String),
      undefined
    ]);
  });

  it('refuses a stem that names a fill', () => {
    expect(stemError('home-filled', ICONS)).toEqual(expect.any(String));
  });
});

describe('costBreakdown', () => {
  const priced = (references: State['references'] = {}): State =>
    state({ settings: { ...state().settings, pricePlain: 0.04, priceReferenced: 0.06 }, references });

  it('names both kinds of image', () => {
    expect(costBreakdown(priced({ home: 1 }), ['home', 'search'], 2)).toBe('2 plain × $0.04 + 2 referenced × $0.06');
  });

  it('drops the referenced term when there are none', () => {
    expect(costBreakdown(priced(), ['home', 'search'], 2)).toBe('4 plain × $0.04');
  });

  it('drops the plain term when there are none', () => {
    expect(costBreakdown(priced({ home: 1 }), ['home'], 2)).toBe('2 referenced × $0.06');
  });

  it('is empty without both prices', () => {
    const s = state({ settings: { ...state().settings, pricePlain: 0.04 } });

    expect(costBreakdown(s, ['home'], 1)).toBe('');
  });
});

describe('priceError', () => {
  const MISSING = 'Enter this price too, or clear the other one';

  it('asks for the price the other field lacks', () => {
    expect(priceError('', '0.04')).toBe(MISSING);
  });

  it('accepts two empty prices', () => {
    expect(priceError('', '')).toBeUndefined();
  });

  it('leaves a filled price alone', () => {
    expect(priceError('0.04', '')).toBeUndefined();
  });

  it('counts a blank as empty', () => {
    expect(priceError('  ', '0.04')).toBe(MISSING);
  });
});
