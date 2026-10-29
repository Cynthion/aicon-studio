import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { form, FormField, FormRoot, schema, validate } from '@angular/forms/signals';
import { CheckboxGroupField, FieldDecorator, FieldHint, FieldLabel, RadioGroupField } from '@cynthion/ngx-formidable';
import type { Quality } from '../api/api.model';
import { ApiService } from '../api/api.service';
import { chosenStems, flowSteps, isDrawn, messageOf, money, runSummary } from '../api/studio.helpers';
import { StudioService } from '../api/studio.service';
import { DialogComponent } from '../ui/dialog/dialog.component';
import { ToastService } from '../ui/toast/toast.service';

interface RunModel {
  styles: string[];
  quality: Quality;
  /** `all` icons, or a test run of the `stems` chosen. */
  icons: string | null;
  stems: string[];
}

const QUALITIES = ['low', 'medium', 'high'].map((value) => ({ value }));

/** Draws every icon, or a test run of chosen icons, once per chosen style, after showing the image count and cost. */
@Component({
  selector: 'studio-run-dialog',
  templateUrl: './run-dialog.component.html',
  styleUrl: './run-dialog.component.scss',
  imports: [
    CheckboxGroupField,
    DialogComponent,
    FieldDecorator,
    FieldHint,
    FieldLabel,
    FormField,
    FormRoot,
    RadioGroupField
  ]
})
export class RunDialogComponent {
  protected readonly studio = inject(StudioService);
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);

  private readonly dialog = viewChild.required(DialogComponent);
  private readonly state = computed(() => this.studio.state()!);
  private readonly drawn = computed(() => this.state().config.icons.filter(isDrawn));

  protected readonly qualities = QUALITIES;
  protected readonly styleOptions = computed(() => this.state().styles.map(({ name }) => ({ value: name })));
  protected readonly iconChoices = computed(() => [
    { value: 'all', label: `All icons (${this.drawn().length})` },
    { value: 'chosen', label: 'Test run: chosen icons' }
  ]);
  protected readonly stemOptions = computed(() =>
    this.drawn().map(({ stem, subject }) => ({ value: stem, label: `${stem} · ${subject}` }))
  );
  protected readonly settingsDone = computed(() => flowSteps(this.state())[0].done);
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly model = signal<RunModel>({
    styles: [],
    quality: this.state().config.quality,
    icons: this.studio.dialog() === 'test-run' ? 'chosen' : 'all',
    stems: chosenStems(this.state(), this.studio.prefs().runStems)
  });
  protected readonly testRun = computed(() => this.model().icons === 'chosen');
  protected readonly form = form(
    this.model,
    schema<RunModel>((path) => {
      validate(path.styles, ({ value }) =>
        value().length ? undefined : { kind: 'styles', message: 'Choose at least one style' }
      );
      validate(path.stems, ({ value }) =>
        !this.testRun() || value().length ? undefined : { kind: 'stems', message: 'Choose at least one icon' }
      );
    }),
    { submission: { action: () => this.start() } }
  );

  private readonly stems = computed(() =>
    this.testRun() ? this.model().stems : this.drawn().map((icon) => icon.stem)
  );
  protected readonly canStart = computed(() => !!this.model().styles.length && !!this.stems().length);
  protected readonly summary = computed(() => {
    const styles = this.model().styles.length;
    if (!styles) {
      return 'Choose at least one style.';
    }
    const icons = this.stems().length;
    if (!icons) {
      return 'Choose at least one icon.';
    }
    const { images, referenced, cost } = runSummary(this.state(), this.stems(), styles);
    return `${icons} icon${icons === 1 ? '' : 's'} × ${styles} style${styles === 1 ? '' : 's'} = ${images} images, ${referenced} of them referenced${cost === null ? '' : `: ${money(cost)}`}.`;
  });

  protected openSettings(): void {
    this.studio.dialog.set('settings');
  }

  protected clearStems(): void {
    this.model.update((model) => ({ ...model, stems: [] }));
  }

  private async start(): Promise<undefined> {
    const { styles, quality, stems } = this.model();
    this.error.set(undefined);
    try {
      await this.api.send('POST', '/api/runs', { styles, quality, ...(this.testRun() ? { stems } : {}) });
    } catch (e) {
      this.error.set(messageOf(e));
      return;
    }
    if (this.testRun()) {
      this.studio.updatePrefs({ runStems: stems });
    }
    this.toasts.info(this.testRun() ? 'Test run started' : 'Run started');
    await this.studio.reload();
    this.dialog().close('started');
  }
}
