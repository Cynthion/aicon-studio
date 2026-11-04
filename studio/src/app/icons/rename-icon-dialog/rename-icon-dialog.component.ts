import { Component, computed, inject, input, linkedSignal, output, signal, viewChild } from '@angular/core';
import { form, FormField, FormRoot, schema, validate } from '@angular/forms/signals';
import { FieldDecorator, FieldHint, FieldLabel, InputField } from '@cynthion/ngx-formidable';
import type { Icon } from '../../api/api.model';
import { ApiService } from '../../api/api.service';
import { filesOf, ICONS_COLUMN, isDrawn, messageOf, stemError } from '../../api/studio.helpers';
import { StudioService } from '../../api/studio.service';
import type { Column } from '../../api/studio.model';
import { DialogComponent } from '../../ui/dialog/dialog.component';
import { ToastService } from '../../ui/toast/toast.service';

/** Renames an icon: its entry, the from of its rotations, its reference and its files in every set and the target. */
@Component({
  selector: 'studio-rename-icon-dialog',
  templateUrl: './rename-icon-dialog.component.html',
  styleUrl: './rename-icon-dialog.component.scss',
  imports: [DialogComponent, FieldDecorator, FieldHint, FieldLabel, FormField, FormRoot, InputField]
})
export class RenameIconDialogComponent {
  readonly icon = input.required<Icon>();

  readonly closed = output();

  protected readonly studio = inject(StudioService);
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);

  private readonly dialog = viewChild.required(DialogComponent);
  private readonly state = computed(() => this.studio.state()!);

  protected readonly error = signal<string | undefined>(undefined);
  protected readonly model = linkedSignal(() => ({ stem: this.icon().stem }));
  protected readonly form = form(
    this.model,
    schema<{ stem: string }>((path) => {
      validate(path.stem, ({ value }) => {
        const message =
          value() === this.icon().stem ? 'Type the new stem' : stemError(value(), this.state().config.icons);
        return message ? { kind: 'stem', message } : undefined;
      });
    }),
    { submission: { action: () => this.rename() } }
  );
  /** What the rename changes besides the entry, each part only where it applies. */
  protected readonly effect = computed(() => {
    const { stem } = this.icon();
    const rotations = this.state()
      .config.icons.filter((icon) => !isDrawn(icon) && icon.from === stem)
      .map((icon) => icon.stem);
    const files = this.where(filesOf(this.state(), stem));
    return [
      `Renames ${stem} in aicon-studio.json`,
      this.state().references[stem] === undefined ? '' : ', its reference',
      rotations.length ? `, the from of ${rotations.join(', ')}` : '',
      files ? ` and its files in ${files}` : '',
      '.'
    ].join('');
  });
  /** The files of the new stem, left by a removed icon, that the rename overwrites. */
  protected readonly overwrite = computed(() => {
    const { stem } = this.model();
    const files = stemError(stem, this.state().config.icons) ? '' : this.where(filesOf(this.state(), stem));
    return files && `${stem}.svg exists in ${files}; Rename overwrites it.`;
  });

  private where(columns: readonly Column[]): string {
    const sets = columns.filter((column) => column.id !== ICONS_COLUMN).length;
    return [columns.length > sets ? this.state().target : '', sets ? `${sets} set${sets > 1 ? 's' : ''}` : '']
      .filter(Boolean)
      .join(' and ');
  }

  private async rename(): Promise<undefined> {
    const from = this.icon().stem;
    const to = this.model().stem;
    this.error.set(undefined);
    try {
      await this.api.send('PUT', `/api/icons/${from}`, { stem: to });
    } catch (e) {
      this.error.set(messageOf(e));
      return;
    }
    const draft = this.studio.drafts()[from];
    if (draft !== undefined) {
      this.studio.setDraft(from, undefined);
      this.studio.setDraft(to, draft);
    }
    this.studio.updatePrefs({ runStems: this.studio.prefs().runStems.map((stem) => (stem === from ? to : stem)) });
    this.studio.selected.update((selected) => (selected?.stem === from ? { ...selected, stem: to } : selected));
    this.toasts.info(`Renamed ${from} to ${to}`);
    await this.studio.reload();
    this.dialog().close('renamed');
  }
}
