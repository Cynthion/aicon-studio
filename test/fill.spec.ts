import * as fs from 'node:fs';
import * as path from 'node:path';
import { refill, RUN_FILE, updateSet, type SetInfo } from '../src/pipeline.ts';
import { CONFIG_FILE, resolveProject, type Project } from '../src/project.ts';
import { FIXTURES, read, readJson, tmpDir } from './helpers.ts';

const RUN = '2026-10-24-0003';
const STEMS = ['home', 'search', 'settings', 'check', 'more', 'help', 'constitution-tracker', 'chevron-right'];
const ROTATIONS = [
  { stem: 'chevron-down', from: 'chevron-right', rotate: 90 },
  { stem: 'chevron-left', from: 'chevron-right', rotate: 180 },
  { stem: 'chevron-up', from: 'chevron-right', rotate: 270 }
];
const FLIP: [number, number] = [509.1, 516.1];

let project: Project;

/** The golden set copied into a project as `<RUN>/<style>`. */
const copySet = (style: string): string => {
  const dir = path.join(project.runs, RUN, style);
  fs.mkdirSync(dir, { recursive: true });
  fs.readdirSync(path.join(FIXTURES, 'set')).forEach((f) =>
    fs.copyFileSync(path.join(FIXTURES, 'set', f), path.join(dir, f))
  );
  return dir;
};
const golden = (file: string): string => read(path.join(FIXTURES, 'set', file));

beforeAll(async () => {
  const dir = tmpDir();
  const icons = readJson<SetInfo>(path.join(FIXTURES, 'set', RUN_FILE)).icons.map(({ stem, subject }) => ({
    stem,
    subject
  }));
  fs.writeFileSync(path.join(dir, CONFIG_FILE), JSON.stringify({ target: './icons', icons: [...icons, ...ROTATIONS] }));
  project = resolveProject(dir);
  copySet('soft');
  await refill(project, `${RUN}/soft`);
});

describe('refill', () => {
  it.each(STEMS)('reproduces the fill of %s', (stem) => {
    expect(read(path.join(project.runs, RUN, 'soft', `${stem}-filled.svg`))).toBe(golden(`${stem}-filled.svg`));
  });

  it.each(ROTATIONS.map((r) => r.stem))('reproduces the rotation %s', (stem) => {
    expect([
      read(path.join(project.runs, RUN, 'soft', `${stem}.svg`)),
      read(path.join(project.runs, RUN, 'soft', `${stem}-filled.svg`))
    ]).toEqual([golden(`${stem}.svg`), golden(`${stem}-filled.svg`)]);
  });

  it('applies a flip', async () => {
    const dir = copySet('flip');
    updateSet(project, `${RUN}/flip`, (info) => ({ ...info, style: 'flip', flips: { home: [FLIP] } }));
    await refill(project, `${RUN}/flip`, ['home']);

    expect(read(path.join(dir, 'home-filled.svg'))).toBe(read(path.join(FIXTURES, 'home-flipped.svg')));
  });
});
