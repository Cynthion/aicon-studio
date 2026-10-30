import type { Drawn, Icon, Job, State, Style } from './api.model';
import type { CellState, Column, FlowStep } from './studio.model';

/** The id of the column of the current icons; every other column is a set, `<run>/<style>`. */
export const ICONS_COLUMN = 'icons';

export const isDrawn = (icon: Icon): icon is Drawn => 'subject' in icon;

/** A stem: the file name of an icon, as the server's `NAME` takes it. */
const STEM = /^[\w-]+$/;
/** A style name: it names the set folders, so lowercase letters, digits and dashes. */
const STYLE_NAME = /^[a-z0-9-]+$/;

/** The current icons first, then every set: those missing from `order` newest first, then `order`. */
export const columns = (state: State, order: readonly string[]): Column[] => {
  const byId = new Map(state.sets.map((entry) => [entry.set, entry]));
  const ids = [
    ...state.sets.map((entry) => entry.set).filter((id) => !order.includes(id)),
    ...order.filter((id) => byId.has(id))
  ];
  return [
    {
      id: ICONS_COLUMN,
      title: 'current icons',
      sub: state.target,
      base: '/files/icons/',
      files: state.icons,
      failed: []
    },
    ...ids.map((id) => {
      const { info, files } = byId.get(id)!;
      return { id, title: info.style, sub: info.run, base: `/files/sets/${id}/`, files, failed: info.failed, info };
    })
  ];
};

/** The saved column order after moving the visible column at `from` to `to`; hidden columns follow the visible. */
export const reorder = (visible: readonly string[], hidden: readonly string[], from: number, to: number): string[] => {
  const moved = visible.filter((_, i) => i !== from);
  moved.splice(to, 0, visible[from]);
  return [...moved, ...hidden];
};

/** The state of an icon's cell in a column; a rotation follows its `from` icon. */
export const cellState = (column: Column, icon: Icon, job: Job | undefined): CellState => {
  const base = isDrawn(icon) ? icon.stem : icon.from;
  const running = job?.running ? job : undefined;
  if (running?.drawing.includes(`${column.id}/${base}`)) {
    return 'drawing';
  }
  if (column.failed.includes(base)) {
    return 'failed';
  }
  if (column.files[icon.stem] !== undefined || !column.info) {
    return '';
  }
  return running?.sets.includes(column.id) ? 'pending' : 'not drawn';
};

/** The estimated cost of drawing the stems, or null without both prices. */
const costOf = (state: State, stems: readonly string[]): number | null => {
  const { pricePlain, priceReferenced } = state.settings;
  if (pricePlain === undefined || priceReferenced === undefined) {
    return null;
  }
  return stems.reduce((sum, stem) => sum + (state.references[stem] === undefined ? pricePlain : priceReferenced), 0);
};

/** The setup checklist: settings, icons, styles and a first run. */
export const flowSteps = (state: State): FlowStep[] => {
  const { baseUrl, hasApiKey, imageModel, describeModel } = state.settings;
  return [
    { key: 'settings', label: 'Settings', done: !!baseUrl && hasApiKey && !!imageModel && !!describeModel },
    { key: 'icons', label: 'Icons', done: state.config.icons.length > 0 },
    { key: 'styles', label: 'Styles', done: state.styles.length > 0 },
    { key: 'run', label: 'First run', done: state.sets.length > 0 }
  ];
};

/** The first step not done yet. */
export const nextStep = (steps: readonly FlowStep[]): FlowStep | undefined => steps.find((step) => !step.done);

export const styleNameError = (name: string, styles: readonly Style[], isNew: boolean): string | undefined => {
  if (!STYLE_NAME.test(name)) {
    return 'Lowercase letters, digits and dashes';
  }
  return isNew && styles.some((style) => style.name === name) ? `A style ${name} exists already` : undefined;
};

export const stylePromptError = (prompt: string): string | undefined => {
  if (!prompt.trim().startsWith('# ')) {
    return 'A prompt starts with a # heading';
  }
  return prompt.includes('{subject}') ? undefined : 'A prompt needs {subject}';
};

/** The last segment of a folder path, the name the page shows for a project. */
export const folderName = (dir: string): string => dir.split(/[\\/]/).filter(Boolean).pop() ?? dir;

export const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export const money = (n: number): string => `≈ $${n.toFixed(n < 0.1 ? 3 : 2)}`;

/** The cost as a label suffix, empty without prices. */
export const costLabel = (state: State, stems: readonly string[]): string => {
  const cost = costOf(state, stems);
  return cost === null ? '' : ` (${money(cost)})`;
};

/** The URL of a file of a column, `<stem>` or `<stem>-filled`, or undefined when the column has none. */
export const fileUrl = (column: Column, file: string): string | undefined =>
  column.files[file] === undefined ? undefined : `${column.base}${file}.svg?v=${column.files[file]}`;

/** The prompt a style sends for a stem: `{subject}` replaced, and the reference prompt for a referenced stem. */
export const promptOf = (state: State, template: string, stem: string): string => {
  const icon = state.config.icons.find((i) => i.stem === stem);
  const prompt = template.replaceAll('{subject}', icon && isDrawn(icon) ? icon.subject : '');
  return state.references[stem] === undefined ? prompt : `${prompt}\n\n${state.referencePrompt}`;
};

/** The job in one line, as the job status shows it. */
export const jobText = (job: Job): string => {
  const failed = job.failed.length;
  if (job.running && job.stopped) {
    return `Stopping: ${job.drawing.length} ${job.drawing.length === 1 ? 'drawing finishes' : 'drawings finish'}`;
  }
  if (job.running) {
    return `Drawing ${job.done}/${job.total}${failed ? ` · ${failed} failed` : ''}`;
  }
  if (job.stopped) {
    return `${job.kind} stopped: ${job.done - failed} drawn, ${job.total - job.done} not drawn`;
  }
  if (job.error) {
    return `${job.kind} stopped: ${job.error}`;
  }
  return `${job.kind} done: ${job.done - failed} drawn${failed ? `, ${failed} failed` : ''}`;
};

/** The drawn icons a set has no outline of: failed, stopped, left out of a test run, or added since. */
export const missingStems = (state: State, column: Column): string[] =>
  state.config.icons
    .filter(isDrawn)
    .map((icon) => icon.stem)
    .filter((stem) => column.files[stem] === undefined);

/** What a run of the chosen stems in `styles` styles draws, and what it costs, or null without prices. */
export const runSummary = (
  state: State,
  stems: readonly string[],
  styles: number
): { images: number; referenced: number; cost: number | null } => {
  const cost = costOf(state, stems);
  return {
    images: stems.length * styles,
    referenced: stems.filter((stem) => state.references[stem] !== undefined).length * styles,
    cost: cost === null ? null : cost * styles
  };
};

/** How the estimate of the stems in `styles` styles adds up, empty without both prices. */
export const costBreakdown = (state: State, stems: readonly string[], styles: number): string => {
  const { pricePlain, priceReferenced } = state.settings;
  if (pricePlain === undefined || priceReferenced === undefined) {
    return '';
  }
  const { images, referenced } = runSummary(state, stems, styles);
  const plain = images - referenced;
  return [
    ...(plain ? [`${plain} plain × $${pricePlain}`] : []),
    ...(referenced ? [`${referenced} referenced × $${priceReferenced}`] : [])
  ].join(' + ');
};

/** Why a price field cannot stay as it is: an estimate needs both prices or neither. */
export const priceError = (own: string, other: string): string | undefined => {
  return !own.trim() && other.trim() ? 'Enter this price too, or clear the other one' : undefined;
};

/** The remembered choice of a test run, without the stems that are no drawn icon any more. */
export const chosenStems = (state: State, remembered: readonly string[]): string[] => {
  const drawn = new Set(state.config.icons.filter(isDrawn).map((icon) => icon.stem));
  return remembered.filter((stem) => drawn.has(stem));
};

/** Why a stem cannot name a new icon, or nothing. */
export const stemError = (stem: string, icons: readonly Icon[]): string | undefined => {
  if (!STEM.test(stem)) {
    return 'Letters, digits, dashes and underscores; it names the files';
  }
  if (stem.endsWith('-filled')) {
    return 'A stem ending in -filled names the fill of another icon';
  }
  return icons.some((icon) => icon.stem === stem) ? `An icon ${stem} exists already` : undefined;
};
