import {
  afterRenderEffect,
  Component,
  computed,
  type ElementRef,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import type { Icon } from '../../api/api.model';
import { ApiService } from '../../api/api.service';
import {
  causeText,
  costLabel,
  fileUrl,
  isDrawn,
  messageOf,
  promptOf,
  redoFlip,
  rephrasingOf,
  undoFlip
} from '../../api/studio.helpers';
import { StudioService } from '../../api/studio.service';
import type { Column } from '../../api/studio.model';
import { PairComponent } from '../../ui/pair/pair.component';
import { ToastService } from '../../ui/toast/toast.service';

const SIZES = [64, 48, 32, 24, 16];

/** One drawing large, at every size, with its subject, its prompt, its flips and what can be done with it. */
@Component({
  selector: 'studio-icon-panel',
  templateUrl: './icon-panel.component.html',
  styleUrl: './icon-panel.component.scss',
  imports: [PairComponent],
  host: { '(document:keydown)': 'onKeydown($event)' }
})
export class IconPanelComponent {
  readonly column = input.required<Column>();
  readonly icon = input.required<Icon>();

  protected readonly studio = inject(StudioService);
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly sizes = SIZES;
  private readonly state = computed(() => this.studio.state()!);
  protected readonly stem = computed(() => this.icon().stem);
  protected readonly drawn = computed(() => isDrawn(this.icon()));
  protected readonly from = computed(() => {
    const icon = this.icon();
    return isDrawn(icon) ? undefined : icon.from;
  });
  protected readonly outline = computed(() => fileUrl(this.column(), this.stem()));
  protected readonly fill = computed(() => fileUrl(this.column(), `${this.stem()}-filled`));
  protected readonly inSet = computed(() => !!this.column().info);
  protected readonly referenced = computed(() => this.state().references[this.stem()] !== undefined);
  protected readonly isReference = computed(
    () => this.state().referencedIn[this.stem()]?.includes(this.column().id) ?? false
  );
  /** Equal by value, so a state read that leaves them as they are does not fetch the fill again. */
  protected readonly flips = computed(() => this.column().info?.flips[this.stem()] ?? [], {
    equal: (a, b) => a.join(' ') === b.join(' ')
  });
  protected readonly subject = computed(() => {
    const icon = this.icon();
    return isDrawn(icon) ? icon.subject : undefined;
  });
  /** The cell by value, so a state read that leaves it as it is keeps the undone flips. */
  private readonly cell = computed(() => `${this.column().id}/${this.stem()}`);
  /** The flips an undo took back, newest last, until the next flip; another cell starts without. */
  protected readonly undone = linkedSignal<string, [number, number][]>({
    source: this.cell,
    computation: () => []
  });
  /** The subject the drawing was made from; none for a stem the set holds no drawing of. */
  protected readonly drawnSubject = computed(() =>
    this.outline() ? this.column().info?.icons.find((i) => i.stem === this.stem())?.subject : undefined
  );
  protected readonly canFlip = computed(() => this.inSet() && this.drawn() && !!this.outline());
  protected readonly prompt = computed(() => {
    const info = this.column().info;
    return info ? promptOf(this.state(), info.prompt, this.stem()) : undefined;
  });
  protected readonly failure = computed(() => {
    const failure = this.column().info?.failures[this.stem()];
    return failure ? { ...failure, ...causeText(failure.cause) } : undefined;
  });
  protected readonly redrawLabel = computed(() => `Redraw${costLabel(this.state(), [this.stem()])}`);
  protected readonly deriving = signal(false);
  protected readonly describing = signal(false);

  private readonly frame = viewChild<ElementRef<HTMLElement>>('frame');

  constructor() {
    // the fill inline, so a click maps to its viewBox units; a marker on every flip, unless they are hidden
    afterRenderEffect((onCleanup) => {
      const frame = this.frame()?.nativeElement;
      const url = this.fill();
      const flips = this.flips();
      const markers = this.studio.prefs().flipMarkers;
      if (!frame || !url) {
        return;
      }
      let stale = false;
      onCleanup(() => (stale = true));
      void fetch(url)
        .then((res) => res.text())
        .then((markup) => {
          if (stale) {
            return;
          }
          frame.innerHTML = markup;
          const svg = frame.querySelector('svg')!;
          const side = Number(svg.getAttribute('viewBox')?.split(' ')[2] ?? 24);
          for (const [x, y] of markers ? flips : []) {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            Object.entries({
              'cx': x,
              'cy': y,
              'r': side * 0.014,
              'stroke-width': side * 0.004,
              'class': 'marker'
            }).forEach(([name, value]) => dot.setAttribute(name, String(value)));
            svg.append(dot);
          }
          svg.addEventListener('click', (event) => {
            const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
            void this.setFlips([...flips, [Math.round(point.x * 10) / 10, Math.round(point.y * 10) / 10]]);
          });
        });
    });
  }

  protected close(): void {
    this.studio.selected.set(undefined);
  }

  protected openFrom(): void {
    this.studio.selected.set({ column: this.column().id, stem: this.from()! });
  }

  protected async useAsReference(): Promise<void> {
    await this.studio.write(
      'PUT',
      `/api/references/${this.stem()}`,
      { set: this.column().id },
      `${this.stem()} is now the reference: later runs keep this composition`
    );
  }

  protected async removeReference(): Promise<void> {
    await this.studio.write(
      'DELETE',
      `/api/references/${this.stem()}`,
      undefined,
      `Removed the reference of ${this.stem()}`
    );
  }

  /** The describe model writes a subject; the Icons view shows it unsaved, beside the saved one. */
  protected async describe(): Promise<void> {
    const stem = this.stem();
    const column = this.column();
    this.describing.set(true);
    try {
      const { subject } = await this.api.send<{ subject: string }>('POST', '/api/describe', { set: column.id, stem });
      this.studio.setDraft(stem, subject);
      this.studio.reveal.set(stem);
      await this.router.navigateByUrl('/icons');
      this.toasts.info(`Wrote a subject for ${stem} from ${column.title}: review it and Save`);
    } catch (e) {
      this.toasts.error(messageOf(e));
    } finally {
      this.describing.set(false);
    }
  }

  protected async redraw(): Promise<void> {
    await this.studio.write('POST', '/api/redraw', { work: [{ set: this.column().id, stem: this.stem() }] });
  }

  protected rephrase(): void {
    this.studio.rephrase(rephrasingOf(this.state(), this.column().id, this.stem()));
  }

  protected undoFlip(): Promise<void> {
    const { flips, undone } = undoFlip({ flips: this.flips(), undone: this.undone() });
    return this.setFlips(flips, undone);
  }

  protected redoFlip(): Promise<void> {
    const { flips, undone } = redoFlip({ flips: this.flips(), undone: this.undone() });
    return this.setFlips(flips, undone);
  }

  protected resetFlips(): Promise<void> {
    return this.setFlips([]);
  }

  protected toggleMarkers(): void {
    this.studio.updatePrefs({ flipMarkers: !this.studio.prefs().flipMarkers });
  }

  /** Stores the flips and derives the fill; `undone` is what a redo brings back. Input meanwhile is ignored: it would build on a stale list. */
  private async setFlips(points: [number, number][], undone: [number, number][] = []): Promise<void> {
    if (this.studio.busy()) {
      this.toasts.error('Wait for the drawing job to finish');
      return;
    }
    if (this.deriving()) {
      return;
    }
    this.undone.set(undone);
    this.deriving.set(true);
    try {
      await this.studio.write('PUT', '/api/flips', { set: this.column().id, stem: this.stem(), points });
    } finally {
      this.deriving.set(false);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (event.key === 'Escape' && !target.closest('dialog, [role="menu"]')) {
      this.close();
    }
    if (target.closest('input, textarea') || !(event.metaKey || event.ctrlKey)) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey && this.flips().length) {
      event.preventDefault();
      void this.undoFlip();
    }
    if (((key === 'z' && event.shiftKey) || key === 'y') && this.undone().length) {
      event.preventDefault();
      void this.redoFlip();
    }
  }
}
