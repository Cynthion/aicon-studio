import * as fs from 'node:fs';
import * as path from 'node:path';
import { CONFIG_FILE, readConfig, resolveProject } from '../src/project.ts';
import { tmpDir } from './helpers.ts';

const write = (dir: string, config: unknown): void =>
  fs.writeFileSync(path.join(dir, CONFIG_FILE), JSON.stringify(config));

describe('resolveProject', () => {
  it('resolves the folder contract from aicon-studio.json', () => {
    const dir = tmpDir();
    write(dir, { target: '../icons', icons: [] });

    expect(resolveProject(dir)).toEqual({
      dir,
      file: path.join(dir, CONFIG_FILE),
      styles: path.join(dir, 'styles'),
      references: path.join(dir, 'references'),
      runs: path.join(dir, 'runs'),
      target: path.join(path.dirname(dir), 'icons')
    });
  });

  it('resolves a relative folder against the working directory', () => {
    const dir = tmpDir();
    write(dir, { target: './icons', icons: [] });

    expect(resolveProject(path.relative(process.cwd(), dir)).dir).toBe(dir);
  });

  it('fails without aicon-studio.json', () => {
    const dir = tmpDir();

    expect(() => resolveProject(dir)).toThrow(`no aicon-studio.json in ${dir}`);
  });

  it('fails without a target', () => {
    const dir = tmpDir();
    write(dir, { icons: [] });

    expect(() => resolveProject(dir)).toThrow('aicon-studio.json needs a target');
  });
});

describe('readConfig', () => {
  it('defaults the quality to medium', () => {
    const dir = tmpDir();
    write(dir, { target: './icons', icons: [] });

    expect(readConfig(resolveProject(dir)).quality).toBe('medium');
  });

  it('re-reads the config on every call', () => {
    const dir = tmpDir();
    write(dir, { target: './icons', icons: [{ stem: 'home', subject: 'a house' }] });
    const project = resolveProject(dir);
    readConfig(project);
    write(dir, { target: './icons', icons: [{ stem: 'home', subject: 'a cottage' }] });

    expect(readConfig(project).icons).toEqual([{ stem: 'home', subject: 'a cottage' }]);
  });
});
