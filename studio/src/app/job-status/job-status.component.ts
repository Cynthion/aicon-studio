import { Component, computed, inject } from '@angular/core';
import { StudioService } from '../api/studio.service';
import { jobText } from '../api/studio.helpers';

/** The drawing job in one line, and its drawings and failures in a popover. */
@Component({
  selector: 'studio-job-status',
  templateUrl: './job-status.component.html',
  styleUrl: './job-status.component.scss'
})
export class JobStatusComponent {
  private readonly studio = inject(StudioService);

  protected readonly job = computed(() => this.studio.state()?.job);
  protected readonly text = computed(() => {
    const job = this.job();
    return job ? jobText(job) : '';
  });
  protected readonly canStop = computed(() => !!this.job()?.running && !this.job()?.stopped);

  protected async stop(): Promise<void> {
    await this.studio.write('POST', '/api/stop', undefined, 'Stopping: the drawings in flight finish and are kept');
  }

  protected readonly lines = computed(() => {
    const job = this.job();
    return job ? [...job.drawing.map((name) => `drawing ${name}`), ...job.failed] : [];
  });
}
