import * as fs from 'node:fs';
import * as path from 'node:path';
import { EMPTY_SETTINGS, publicSettings, readSettings, settingsFile, writeSettings } from '../src/settings.ts';
import { tmpDir } from './helpers.ts';

const mode = (file: string): number => fs.statSync(file).mode & 0o777;

describe('settingsFile', () => {
  it('lives under XDG_CONFIG_HOME', () => {
    expect(settingsFile({ XDG_CONFIG_HOME: '/x' }, '/h')).toBe('/x/aicon-studio/settings.json');
  });

  it('falls back to ~/.config', () => {
    expect(settingsFile({}, '/h')).toBe('/h/.config/aicon-studio/settings.json');
  });
});

describe('readSettings', () => {
  it('reads empty settings when the file is missing', () => {
    expect(readSettings(path.join(tmpDir(), 'settings.json'))).toEqual({
      baseUrl: '',
      apiKey: '',
      imageModel: '',
      describeModel: ''
    });
  });

  it('reads back what was written', () => {
    const file = path.join(tmpDir(), 'settings.json');
    const settings = { ...EMPTY_SETTINGS, baseUrl: 'http://x/v1', apiKey: 'k', pricePlain: 0.01 };
    writeSettings(file, settings);

    expect(readSettings(file)).toEqual(settings);
  });
});

describe('writeSettings', () => {
  it('creates the folder and writes the file readable by the owner only', () => {
    const file = path.join(tmpDir(), 'aicon-studio', 'settings.json');
    writeSettings(file, EMPTY_SETTINGS);

    expect(mode(file)).toBe(0o600);
  });

  it('narrows a wider mode on rewrite', () => {
    const file = path.join(tmpDir(), 'settings.json');
    fs.writeFileSync(file, '{}', { mode: 0o644 });
    writeSettings(file, EMPTY_SETTINGS);

    expect(mode(file)).toBe(0o600);
  });
});

describe('publicSettings', () => {
  it('shows the settings without the key', () => {
    expect(publicSettings({ ...EMPTY_SETTINGS, apiKey: 'sk-1', imageModel: 'm' })).toEqual({
      baseUrl: '',
      imageModel: 'm',
      describeModel: '',
      hasApiKey: true
    });
  });

  it('shows that no key is stored', () => {
    expect(publicSettings(EMPTY_SETTINGS).hasApiKey).toBe(false);
  });
});
