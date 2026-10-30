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
export type DialogName = 'settings' | 'project' | 'run' | 'test-run' | 'add-icon';

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

/** A view holding edits that are not saved yet. */
export interface Unsaved {
  /** What is unsaved, such as `2 subjects`, or nothing. */
  unsaved(): string | undefined;
  discard(): void;
}
