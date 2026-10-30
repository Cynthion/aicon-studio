import { Component, computed, inject, linkedSignal, signal, untracked } from '@angular/core';
import { disabled, form, FormField, FormRoot, schema, validate } from '@angular/forms/signals';
import {
  FieldDecorator,
  FieldHint,
  FieldLabel,
  InputField,
  SelectField,
  TextareaField
} from '@cynthion/ngx-formidable';
import { ApiService } from '../api/api.service';
import { isDrawn, messageOf, promptOf, styleNameError, stylePromptError } from '../api/studio.helpers';
import { StudioService } from '../api/studio.service';
import type { StyleDraft, Unsaved } from '../api/studio.model';
import { ConfirmService } from '../ui/confirm/confirm.service';
import { ToastService } from '../ui/toast/toast.service';

interface StyleModel {
  name: string;
  prompt: string;
}

const NEW_STYLE: StyleDraft = {
  name: '',
  prompt: '# New Style\n\nCreate a minimal UI icon of {subject} in …',
  isNew: true
};

/** The drawing prompts: a list, and the editor of one with a preview of its prompt for one icon. */
@Component({
  selector: 'studio-styles',
  templateUrl: './styles.component.html',
  styleUrl: './styles.component.scss',
  imports: [FieldDecorator, FieldHint, FieldLabel, FormField, FormRoot, InputField, SelectField, TextareaField]
})
export class StylesComponent implements Unsaved {
  protected readonly studio = inject(StudioService);
  private readonly api = inject(ApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);

  private readonly state = computed(() => this.studio.state()!);
  private readonly project = computed(() => this.state().project);
  /** The style open in the editor, as saved; undefined while none is open, and again after a project switch. */
  protected readonly editing = linkedSignal<string, StyleDraft | undefined>({
    source: this.project,
    computation: () => undefined
  });
  protected readonly isNew = computed(() => !!this.editing()?.isNew);
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly model = signal<StyleModel>({ name: '', prompt: '' });
  protected readonly form = form(
    this.model,
    schema<StyleModel>((path) => {
      disabled(path.name, { when: () => !this.isNew() });
      validate(path.name, ({ value }) => {
        const message = styleNameError(value(), this.state().styles, this.isNew());
        return message ? { kind: 'name', message } : undefined;
      });
      validate(path.prompt, ({ value }) => {
        const message = stylePromptError(value());
        return message ? { kind: 'prompt', message } : undefined;
      });
    }),
    { submission: { action: () => this.save() } }
  );
  protected readonly changed = computed(() => {
    const editing = this.editing();
    const model = this.model();
    return !!editing && (editing.isNew || model.name !== editing.name || model.prompt !== editing.prompt);
  });
  protected readonly stemOptions = computed(() =>
    this.state()
      .config.icons.filter(isDrawn)
      .map(({ stem }) => ({ value: stem }))
  );
  protected readonly previewStem = linkedSignal<string, string | null>({
    source: this.project,
    computation: () => untracked(this.stemOptions)[0]?.value ?? null
  });
  protected readonly preview = computed(() => promptOf(this.state(), this.model().prompt, this.previewStem() ?? ''));

  constructor() {
    const draft = this.studio.styleDraft();
    if (draft) {
      this.studio.styleDraft.set(undefined);
      this.open(draft);
    }
  }

  unsaved(): string | undefined {
    return this.changed() ? `The style ${this.model().name || 'being written'} is` : undefined;
  }

  discard(): void {
    this.editing.set(undefined);
  }

  protected async choose(draft: StyleDraft): Promise<void> {
    const unsaved = this.unsaved();
    if (
      unsaved &&
      !(await this.confirm.ask({
        title: 'Discard unsaved changes?',
        body: `${unsaved} not saved yet.`,
        action: 'Discard',
        cancel: 'Keep editing',
        danger: true
      }))
    ) {
      return;
    }
    this.open(draft);
  }

  protected newStyle(): Promise<void> {
    return this.choose(NEW_STYLE);
  }

  protected edit(name: string): Promise<void> {
    const style = this.state().styles.find((s) => s.name === name)!;
    return this.choose({ ...style, isNew: false });
  }

  protected duplicate(): Promise<void> {
    return this.choose({ name: `${this.model().name}-2`, prompt: this.model().prompt, isNew: true });
  }

  protected revert(): void {
    const editing = this.editing();
    if (editing) {
      this.open(editing);
    }
  }

  protected async remove(): Promise<void> {
    const { name } = this.model();
    if (
      await this.confirm.ask({
        title: `Delete the style ${name}?`,
        body: 'The prompt file is deleted. Its sets stay.',
        action: `Delete style ${name}`,
        danger: true
      })
    ) {
      const deleted = await this.studio.write('DELETE', `/api/styles/${name}`, undefined, `Deleted ${name}`);
      if (deleted) {
        this.editing.set(undefined);
      }
    }
  }

  private open(draft: StyleDraft): void {
    this.error.set(undefined);
    this.editing.set(draft);
    this.model.set({ name: draft.name, prompt: draft.prompt });
    this.form().reset();
  }

  private async save(): Promise<undefined> {
    const { name, prompt } = this.model();
    this.error.set(undefined);
    try {
      await this.api.send('PUT', `/api/styles/${name}`, { prompt });
    } catch (e) {
      this.error.set(messageOf(e));
      return;
    }
    this.toasts.info(`Saved ${name}`);
    await this.studio.reload();
    this.open({ name, prompt: prompt.trim(), isNew: false });
  }
}
