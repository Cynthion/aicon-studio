import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/** Per-user settings: the endpoint, its key and the models. Never inside a project folder. */
export interface Settings {
  /** An OpenAI-compatible base URL ending in `/v1`, without a trailing slash. */
  baseUrl: string;
  apiKey: string;
  imageModel: string;
  /** A chat model with image input, which writes a subject from a drawing. */
  describeModel: string;
  /** Price of one plain image, shown as the cost estimate; absent hides the estimates. */
  pricePlain?: number;
  /** Price of one image drawn with a reference image. */
  priceReferenced?: number;
}
/** The settings as the page sees them: the key is never returned. */
export interface PublicSettings {
  baseUrl: string;
  imageModel: string;
  describeModel: string;
  pricePlain?: number;
  priceReferenced?: number;
  hasApiKey: boolean;
}

export const EMPTY_SETTINGS: Settings = { baseUrl: '', apiKey: '', imageModel: '', describeModel: '' };

/** `$XDG_CONFIG_HOME/aicon-studio/settings.json`, under `~/.config` when the variable is unset or empty. */
export const settingsFile = (env: NodeJS.ProcessEnv = process.env, home: string = os.homedir()): string => {
  const configHome = env['XDG_CONFIG_HOME'];
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- the XDG spec treats an empty variable as unset
  return path.join(configHome ? configHome : path.join(home, '.config'), 'aicon-studio', 'settings.json');
};

export const readSettings = (file: string): Settings =>
  fs.existsSync(file)
    ? { ...EMPTY_SETTINGS, ...(JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<Settings>) }
    : { ...EMPTY_SETTINGS };

/** Writes the file readable by its owner only, whatever mode it had. */
export const writeSettings = (file: string, settings: Settings): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
};

export const publicSettings = ({ apiKey, ...rest }: Settings): PublicSettings => ({
  ...rest,
  hasApiKey: apiKey !== ''
});
