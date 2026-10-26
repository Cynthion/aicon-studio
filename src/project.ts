import * as fs from 'node:fs';
import * as path from 'node:path';

/** The file that makes a folder a project. */
export const CONFIG_FILE = 'aicon-studio.json';

/** An icon drawn from a subject, written as <stem>.svg and <stem>-filled.svg. */
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
export type Quality = 'low' | 'medium' | 'high';
export interface Config {
  /** Where Adopt copies the icons to, relative to aicon-studio.json. */
  target: string;
  quality: Quality;
  icons: (Drawn | Rotated)[];
}
/** The folder contract, resolved into absolute paths. */
export interface Project {
  dir: string;
  file: string;
  target: string;
  styles: string;
  references: string;
  runs: string;
}

export const isDrawn = (icon: Drawn | Rotated): icon is Drawn => 'subject' in icon;

/** aicon-studio.json as it is on disk now; a subject saved in the studio is read on the next call. */
export const readConfig = (project: Pick<Project, 'file'>): Config => {
  const raw = JSON.parse(fs.readFileSync(project.file, 'utf8')) as Partial<Config>;
  if (typeof raw.target !== 'string' || !raw.target) {
    throw new Error(`${CONFIG_FILE} needs a target`);
  }
  if (!Array.isArray(raw.icons)) {
    throw new Error(`${CONFIG_FILE} needs an icons array`);
  }
  return { ...raw, target: raw.target, icons: raw.icons, quality: raw.quality ?? 'medium' };
};

export const updateConfig = (project: Project, change: (config: Config) => Config): void =>
  fs.writeFileSync(project.file, `${JSON.stringify(change(readConfig(project)), null, 2)}\n`);

/** The project in a folder: its aicon-studio.json, the fixed folders beside it and the target it names. */
export const resolveProject = (folder: string): Project => {
  const dir = path.resolve(folder);
  const file = path.join(dir, CONFIG_FILE);
  if (!fs.existsSync(file)) {
    throw new Error(`no ${CONFIG_FILE} in ${dir}`);
  }
  return {
    dir,
    file,
    target: path.resolve(dir, readConfig({ file }).target),
    styles: path.join(dir, 'styles'),
    references: path.join(dir, 'references'),
    runs: path.join(dir, 'runs')
  };
};
