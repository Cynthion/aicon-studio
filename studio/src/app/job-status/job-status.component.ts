import { Component, computed, type ElementRef, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import type { Cause } from '../api/api.model';
import {
  causeText,
  costLabel,
  type Drawing,
  failureGroups,
  failureList,
  jobText,
  logText,
  notDrawnList,
  rephrasingOf
} from '../api/studio.helpers';
import { StudioService } from '../api/studio.service';

/** A group of the job log: the failures of one cause, or the icons left not drawn. */
interface Section {
  key: Cause | 'not-drawn';
  title: string;
  advice: string;
  entries: (Drawing & { message?: string })[];
  rephrase: boolean;
}

const NOT_DRAWN = {
  title: 'Not drawn',
  advice:
    'A stop, a closed studio or a failure from before the job log left these without a drawing. Redraw all picks up where the job left off.'
};

/** The drawing job in one line, and in the job log what it draws now and what the sets lack, with the way out of each. */
@Component({
  selector: 'studio-job-status',
  templateUrl: './job-status.component.html',
  styleUrl: './job-status.component.scss'
})
export class JobStatusComponent {
  protected readonly studio = inject(StudioService);
  private readonly router = inject(Router);

  private readonly log = viewChild.required<ElementRef<HTMLElement>>('log');

  protected readonly causeText = causeText;
  private readonly state = computed(() => this.studio.state()!);
  protected readonly job = computed(() => this.state().job);
  private readonly failures = computed(() => failureList(this.state()));
  private readonly notDrawn = computed(() => notDrawnList(this.state()));
  protected readonly sections = computed<Section[]>(() => [
    ...failureGroups(this.failures()).map(({ cause, failures }) => ({
      key: cause,
      ...causeText(cause),
      entries: failures,
      rephrase: true
    })),
    ...(this.notDrawn().length
      ? [{ key: 'not-drawn' as const, ...NOT_DRAWN, entries: this.notDrawn(), rephrase: false }]
      : [])
  ]);
  protected readonly drawing = computed(() =>
    (this.job()?.drawing ?? []).map((name) => {
      const [run, style, stem] = name.split('/');
      return { name, run, style, stem };
    })
  );
  protected readonly text = computed(() => {
    const job = this.job();
    return job ? jobText(job, this.failures().length) : logText(this.failures().length, this.notDrawn().length);
  });
  protected readonly canStop = computed(() => !!this.job()?.running && !this.job()?.stopped);
  protected readonly failed = computed(() => {
    const job = this.job();
    return !job?.running && (!!this.failures().length || !!job?.error || !!job?.halted);
  });

  protected redrawAllLabel(entries: readonly Drawing[]): string {
    return `Redraw all ${entries.length}${costLabel(
      this.state(),
      entries.map(({ stem }) => stem)
    )}`;
  }

  protected async stop(): Promise<void> {
    await this.studio.write('POST', '/api/stop', undefined, 'Stopping: the drawings in flight finish and are kept');
  }

  protected async redraw(entries: readonly Drawing[]): Promise<void> {
    await this.studio.write('POST', '/api/redraw', { work: entries.map(({ set, stem }) => ({ set, stem })) });
  }

  protected rephrase({ set, stem }: Drawing): void {
    this.studio.rephrase(rephrasingOf(this.state(), set, stem));
  }

  /** The icon panel of the drawing. */
  protected async open({ set, stem }: Drawing): Promise<void> {
    this.log().nativeElement.hidePopover();
    this.studio.selected.set({ column: set, stem });
    await this.router.navigateByUrl('/sets');
  }

  protected openSettings(): void {
    this.log().nativeElement.hidePopover();
    this.studio.dialog.set('settings');
  }
}
