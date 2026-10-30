import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ToastService } from '../ui/toast/toast.service';
import type { State } from './api.model';
import { ApiService } from './api.service';
import { folderName, messageOf } from './studio.helpers';
import type { DialogName, Prefs, Selection, StyleDraft } from './studio.model';

const PREFS_KEY = 'aicon-studio';
const RECENT = 8;
const POLL_MS = 2000;

const loadPrefs = (): Prefs => {
  const base: Prefs = {
    size: 32,
    theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    pair: 'side',
    hidden: [],
    order: [],
    runStems: [],
    projects: []
  };
  try {
    return { ...base, ...(JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>) };
  } catch {
    return base;
  }
};

/** The state of the project and of the page, shared by every view. */
@Injectable({ providedIn: 'root' })
export class StudioService {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);
  private readonly title = inject(Title);

  readonly state = signal<State | undefined>(undefined);
  readonly prefs = signal<Prefs>(loadPrefs());
  readonly dialog = signal<DialogName | undefined>(undefined);
  readonly selected = signal<Selection | undefined>(undefined);
  readonly search = signal('');
  /** Stem -> a subject not saved yet. */
  readonly drafts = signal<Record<string, string>>({});
  readonly styleDraft = signal<StyleDraft | undefined>(undefined);
  /** A stem whose subject field the Icons view focuses once it shows, such as one just described. */
  readonly reveal = signal<string | undefined>(undefined);
  readonly busy = computed(() => !!this.state()?.job?.running);

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs()));
      } catch {
        // the preferences are a convenience
      }
    });
    effect(() => {
      const { theme, size } = this.prefs();
      document.documentElement.dataset['theme'] = theme;
      document.documentElement.style.setProperty('--size', `${size}px`);
    });
  }

  /** Reads the state again, and keeps reading it every two seconds while a job runs, a failed read included. */
  async reload(): Promise<void> {
    clearTimeout(this.timer);
    try {
      const state = await this.api.send<State>('GET', '/api/state');
      this.state.set(state);
      this.remember(state.project);
      this.title.setTitle(`${folderName(state.project)} · Aicon Studio`);
    } catch (e) {
      this.toasts.error(messageOf(e));
    }
    if (this.state()?.job?.running) {
      this.timer = setTimeout(() => void this.reload(), POLL_MS);
    }
  }

  /** A write through the API, `done` shown on success and the error otherwise; the state is read again either way. */
  async write<T = unknown>(method: string, url: string, body?: unknown, done?: string): Promise<T | undefined> {
    try {
      const answer = await this.api.send<T>(method, url, body);
      if (done) {
        this.toasts.info(done);
      }
      return answer;
    } catch (e) {
      this.toasts.error(messageOf(e));
      return undefined;
    } finally {
      await this.reload();
    }
  }

  updatePrefs(patch: Partial<Prefs>): void {
    this.prefs.update((prefs) => ({ ...prefs, ...patch }));
  }

  /** Puts the project first among the recent projects. */
  remember(dir: string): void {
    const { projects } = this.prefs();
    if (projects[0] !== dir) {
      this.updatePrefs({ projects: [dir, ...projects.filter((d) => d !== dir)].slice(0, RECENT) });
    }
  }

  forget(dir: string): void {
    this.updatePrefs({ projects: this.prefs().projects.filter((d) => d !== dir) });
  }

  setDraft(stem: string, subject: string | undefined): void {
    this.drafts.update(({ [stem]: _, ...rest }) => (subject === undefined ? rest : { ...rest, [stem]: subject }));
  }
}
