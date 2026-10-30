// What GET /api/state answers, see HTTP API in .documentation/tech/pipeline.md. The server declares these shapes in
// src/project.ts, src/pipeline.ts and src/settings.ts; the page repeats them, because those files import node:fs.

/** An icon drawn from a subject. */
export interface Drawn {
  stem: string;
  subject: string;
}
/** An icon made by rotating another icon of the same set. */
export interface Rotated {
  stem: string;
  from: string;
  rotate: number;
}
export type Icon = Drawn | Rotated;
export type Quality = 'low' | 'medium' | 'high';
export interface Config {
  target: string;
  quality: Quality;
  icons: Icon[];
}
export interface Style {
  name: string;
  prompt: string;
}
/** `_run.json` of a set. */
export interface SetInfo {
  run: string;
  style: string;
  imageModel: string;
  quality: string;
  prompt: string;
  icons: { stem: string; subject: string; referenced: boolean }[];
  failed: string[];
  flips: Record<string, [number, number][]>;
}
/** A set as the state lists it: `<run>/<style>`, its record and its files. */
export interface SetEntry {
  set: string;
  info: SetInfo;
  /** File name without `.svg` -> modification time. */
  files: Record<string, number>;
}
export interface Job {
  kind: string;
  running: boolean;
  error?: string;
  total: number;
  done: number;
  failed: string[];
  drawing: string[];
  sets: string[];
  stopped: boolean;
}
export interface PublicSettings {
  baseUrl: string;
  imageModel: string;
  describeModel: string;
  pricePlain?: number;
  priceReferenced?: number;
  hasApiKey: boolean;
}
export interface State {
  project: string;
  config: Config;
  target: string;
  styles: Style[];
  referencePrompt: string;
  /** The files of the target, as `files` of a set. */
  icons: Record<string, number>;
  references: Record<string, number>;
  /** Referenced stem -> the columns, `icons` or a set, whose outline is that reference. */
  referencedIn: Record<string, string[]>;
  sets: SetEntry[];
  settings: PublicSettings;
  job?: Job;
}
