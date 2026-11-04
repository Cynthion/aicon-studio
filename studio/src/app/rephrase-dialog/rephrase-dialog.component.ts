import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { form, FormField, FormRoot, required, schema, validate } from '@angular/forms/signals';
import { FieldDecorator, FieldHint, FieldLabel, TextareaField } from '@cynthion/ngx-formidable';
import { ApiService } from '../api/api.service';
import { costLabel, messageOf, stylePromptError } from '../api/studio.helpers';
import { StudioService } from '../api/studio.service';
import { DialogComponent } from '../ui/dialog/dialog.component';

interface RephraseModel {
  reason: string;
  text: string;
}

/** The describe model rephrases a subject or a style for a reason; the result is reviewed, then saved and redrawn with, or handed back. */
@Component({
  selector: 'studio-rephrase-dialog',
  templateUrl: './rephrase-dialog.component.html',
  styleUrl: './rephrase-dialog.component.scss',
  imports: [DialogComponent, FieldDecorator, FieldHint, FieldLabel, FormField, FormRoot, TextareaField]
})
export class RephraseDialogComponent {
  protected readonly studio = inject(StudioService);
  private readonly api = inject(ApiService);

  private readonly dialog = viewChild.required(DialogComponent);

  protected readonly target = this.studio.rephrasing()!;
  protected readonly isSubject = this.target.kind === 'subject';
  protected readonly headline = this.isSubject
    ? `Rephrase the subject of ${this.target.name}`
    : `Rephrase the style ${this.target.name}`;
  protected readonly model = signal<RephraseModel>({ reason: this.target.reason, text: '' });
  protected readonly rephrased = signal(false);
  protected readonly rephrasing = signal(false);
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly form = form(
    this.model,
    schema<RephraseModel>((path) => {
      required(path.reason, { message: 'Give a reason' });
      validate(path.text, ({ value }) => {
        if (!this.rephrased()) {
          return undefined;
        }
        const message = this.isSubject
          ? value().trim()
            ? undefined
            : 'A subject must not be empty'
          : stylePromptError(value());
        return message ? { kind: 'text', message } : undefined;
      });
    }),
    { submission: { action: () => this.apply() } }
  );

  private readonly state = computed(() => this.studio.state()!);
  protected readonly applyLabel = computed(() => {
    const { name, work } = this.target;
    if (!this.isSubject) {
      return 'Use this prompt';
    }
    if (!work.length) {
      return 'Save subject';
    }
    const what = work.length === 1 ? name : `${name} in ${work.length} sets`;
    return `Save subject and redraw ${what}${costLabel(
      this.state(),
      work.map(({ stem }) => stem)
    )}`;
  });

  protected async rephrase(): Promise<void> {
    const { name, set, text } = this.target;
    const reason = this.model().reason;
    this.error.set(undefined);
    this.rephrasing.set(true);
    try {
      const answer = this.isSubject
        ? (await this.api.send<{ subject: string }>('POST', '/api/rephrase', { stem: name, set, reason })).subject
        : (await this.api.send<{ prompt: string }>('POST', '/api/rephrase', { prompt: text, reason })).prompt;
      this.model.update((model) => ({ ...model, text: answer }));
      this.rephrased.set(true);
    } catch (e) {
      this.error.set(messageOf(e));
    } finally {
      this.rephrasing.set(false);
    }
  }

  private async apply(): Promise<undefined> {
    const text = this.model().text.trim();
    const { name, use, work } = this.target;
    this.error.set(undefined);
    if (!this.isSubject) {
      use?.(text);
      this.dialog().close('used');
      return;
    }
    try {
      await this.api.send('PUT', `/api/subjects/${name}`, { subject: text });
      if (work.length) {
        await this.api.send('POST', '/api/redraw', { work });
      }
    } catch (e) {
      this.error.set(messageOf(e));
      return;
    }
    await this.studio.reload();
    this.dialog().close('saved');
  }
}
