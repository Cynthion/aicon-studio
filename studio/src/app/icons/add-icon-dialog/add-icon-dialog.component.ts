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
import { isDrawn, messageOf, parseIcons, stemError } from '../../api/studio.helpers';
import { StudioService } from '../../api/studio.service';
import { DialogComponent } from '../../ui/dialog/dialog.component';
import { ToastService } from '../../ui/toast/toast.service';

interface IconModel {
  kind: string | null;
  stem: string;
  subject: string;
  from: string | null;
  rotate: string | null;
  list: string;
}

const KINDS = [
  { value: 'drawn', label: 'Drawn from a subject' },
  { value: 'rotation', label: 'Rotation of a drawn icon' },
  { value: 'list', label: 'Several, pasted as a list' }
];
const ANGLES = ['90', '180', '270'].map((value) => ({ value, label: `${value}°` }));

/** Adds an icon to aicon-studio.json: drawn from a subject, a rotation of a drawn icon, or several drawn icons pasted as a list. */
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
  protected readonly model = signal<IconModel>({
    kind: 'drawn',
    stem: '',
    subject: '',
    from: null,
    rotate: '90',
    list: ''
  });
  protected readonly rotation = computed(() => this.model().kind === 'rotation');
  protected readonly several = computed(() => this.model().kind === 'list');
  protected readonly parsed = computed(() => parseIcons(this.model().list, this.icons()));
  protected readonly submitLabel = computed(() => {
    const count = this.parsed().error ? 0 : this.parsed().icons.length;
    return this.several() && count ? `Add ${count} icon${count > 1 ? 's' : ''}` : 'Add icon';
  });
  protected readonly form = form(
    this.model,
    schema<IconModel>((path) => {
      validate(path.stem, ({ value }) => {
        const message = this.several() ? undefined : stemError(value(), this.icons());
        return message ? { kind: 'stem', message } : undefined;
      });
      validate(path.list, () => {
        const message = this.several() ? this.parsed().error : undefined;
        return message ? { kind: 'list', message } : undefined;
      });
      required(path.subject, {
        message: 'Describe the symbol to draw, such as a gear',
        when: () => this.model().kind === 'drawn'
      });
      required(path.from, { message: 'Choose the icon to rotate', when: () => this.rotation() });
      required(path.rotate, { message: 'Choose the angle', when: () => this.rotation() });
    }),
    { submission: { action: () => this.add() } }
  );

  private async add(): Promise<undefined> {
    const { stem, subject, from, rotate } = this.model();
    const { icons } = this.parsed();
    this.error.set(undefined);
    try {
      await this.api.send(
        'POST',
        '/api/icons',
        this.several()
          ? { icons }
          : this.rotation()
            ? { stem, from, rotate: Number(rotate) }
            : { stem, subject: subject.trim() }
      );
    } catch (e) {
      this.error.set(messageOf(e));
      return;
    }
    this.toasts.info(
      this.several()
        ? `Added ${icons.length} icons: the next run draws them, Complete set draws them into a set`
        : this.rotation()
          ? `Added ${stem}, drawn in every set that holds ${from}`
          : `Added ${stem}: the next run draws it, Complete set draws it into a set`
    );
    this.studio.reveal.set(this.several() ? icons[0].stem : stem);
    await this.studio.reload();
    this.dialog().close('added');
  }
}
