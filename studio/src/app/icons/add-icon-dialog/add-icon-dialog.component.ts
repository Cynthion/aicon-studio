import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { form, FormField, FormRoot, required, schema, validate } from '@angular/forms/signals';
import {
  FieldDecorator,
  FieldHint,
  FieldLabel,
  InputField,
  RadioGroupField,
  SelectField,
  TextareaField
} from '@cynthion/ngx-formidable';
import { ApiService } from '../../api/api.service';
import { isDrawn, messageOf, stemError } from '../../api/studio.helpers';
import { StudioService } from '../../api/studio.service';
import { DialogComponent } from '../../ui/dialog/dialog.component';
import { ToastService } from '../../ui/toast/toast.service';

interface IconModel {
  kind: string | null;
  stem: string;
  subject: string;
  from: string | null;
  rotate: string | null;
}

const KINDS = [
  { value: 'drawn', label: 'Drawn from a subject' },
  { value: 'rotation', label: 'Rotation of a drawn icon' }
];
const ANGLES = ['90', '180', '270'].map((value) => ({ value, label: `${value}°` }));

/** Adds an icon to aicon-studio.json: drawn from a subject, or a rotation of a drawn icon. */
@Component({
  selector: 'studio-add-icon-dialog',
  templateUrl: './add-icon-dialog.component.html',
  styleUrl: './add-icon-dialog.component.scss',
  imports: [
    DialogComponent,
    FieldDecorator,
    FieldHint,
    FieldLabel,
    FormField,
    FormRoot,
    InputField,
    RadioGroupField,
    SelectField,
    TextareaField
  ]
})
export class AddIconDialogComponent {
  protected readonly studio = inject(StudioService);
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);

  private readonly dialog = viewChild.required(DialogComponent);
  private readonly icons = computed(() => this.studio.state()!.config.icons);

  protected readonly kinds = KINDS;
  protected readonly angles = ANGLES;
  protected readonly fromOptions = computed(() =>
    this.icons()
      .filter(isDrawn)
      .map(({ stem }) => ({ value: stem }))
  );
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly model = signal<IconModel>({ kind: 'drawn', stem: '', subject: '', from: null, rotate: '90' });
  protected readonly rotation = computed(() => this.model().kind === 'rotation');
  protected readonly form = form(
    this.model,
    schema<IconModel>((path) => {
      validate(path.stem, ({ value }) => {
        const message = stemError(value(), this.icons());
        return message ? { kind: 'stem', message } : undefined;
      });
      required(path.subject, { message: 'Describe the symbol to draw, such as a gear', when: () => !this.rotation() });
      required(path.from, { message: 'Choose the icon to rotate', when: () => this.rotation() });
      required(path.rotate, { message: 'Choose the angle', when: () => this.rotation() });
    }),
    { submission: { action: () => this.add() } }
  );

  private async add(): Promise<undefined> {
    const { stem, subject, from, rotate } = this.model();
    this.error.set(undefined);
    try {
      await this.api.send(
        'POST',
        '/api/icons',
        this.rotation() ? { stem, from, rotate: Number(rotate) } : { stem, subject: subject.trim() }
      );
    } catch (e) {
      this.error.set(messageOf(e));
      return;
    }
    this.toasts.info(
      this.rotation()
        ? `Added ${stem}, drawn in every set that holds ${from}`
        : `Added ${stem}: the next run draws it, Complete set draws it into a set`
    );
    this.studio.reveal.set(stem);
    await this.studio.reload();
    this.dialog().close('added');
  }
}
