import type { SetInfo } from './api.model';

/** A column of the Sets view: the current icons, or one set. */
export interface Column {
  id: string;
  title: string;
  sub: string;
  /** The URL its files are served under. */
  base: string;
  /** File name without `.svg` -> modification time. */
  files: Record<string, number>;
  failed: string[];
  info?: SetInfo;
}

export type CellState = '' | 'drawing' | 'failed' | 'pending' | 'not drawn';

export interface FlowStep {
  key: 'settings' | 'icons' | 'styles' | 'run';
  label: string;
  done: boolean;
}

/** What the page keeps per browser, in `localStorage['aicon-studio']`. */
export interface Prefs {
  size: number;
  theme: 'light' | 'dark';
  pair: 'side' | 'hover';
  /** Whether a dot marks every flip in the icon panel. */
  flipMarkers: boolean;
  /** Hidden columns. */
  hidden: string[];
  /** The saved order of the set columns. */
  order: string[];
  /** The icons chosen for the last test run. */
  runStems: string[];
  /** Recently opened project folders, newest first. */
  projects: string[];
}

/** `run` and `test-run` open the same dialog, preset to every icon or to chosen icons. */
export type DialogName = 'settings' | 'project' | 'run' | 'test-run' | 'add-icon' | 'rephrase';

/** The cell open in the icon panel. */
export interface Selection {
  column: string;
  stem: string;
}

/** A style the Styles view opens, such as one started from the prompt of a set. */
export interface StyleDraft {
  name: string;
  prompt: string;
  isNew: boolean;
}

/** What the rephrase dialog starts from, and what becomes of its result. */
export interface Rephrasing {
  /** The subject of an icon, saved and redrawn with; or a style, handed to `use`. */
  kind: 'subject' | 'style';
  /** The stem or the style name. */
  name: string;
  /** The subject or the prompt as it is now. */
  text: string;
  /** Prefilled, such as with the message of a failed drawing. */
  reason: string;
  /** The set whose style the subject was drawn in, sent along so the describe model knows it. */
  set?: string;
  /** What is redrawn with a rephrased subject. */
  work: { set: string; stem: string }[];
  /** Takes a rephrased style. */
  use?: (prompt: string) => void;
}

/** A view holding edits that are not saved yet. */
export interface Unsaved {
  /** What is unsaved, such as `2 subjects`, or nothing. */
  unsaved(): string | undefined;
  discard(): void;
}
