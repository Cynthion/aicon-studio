import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { StudioService } from './api/studio.service';
import { folderName } from './api/studio.helpers';
import { FlowComponent } from './flow/flow.component';
import { JobStatusComponent } from './job-status/job-status.component';
import { ProjectDialogComponent } from './project-dialog/project-dialog.component';
import { RunDialogComponent } from './run-dialog/run-dialog.component';
import { SettingsDialogComponent } from './settings-dialog/settings-dialog.component';
import { ConfirmComponent } from './ui/confirm/confirm.component';
import { ToastComponent } from './ui/toast/toast.component';

@Component({
  selector: 'studio-app',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [
    ConfirmComponent,
    FlowComponent,
    JobStatusComponent,
    ProjectDialogComponent,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    RunDialogComponent,
    SettingsDialogComponent,
    ToastComponent
  ]
})
export class AppComponent {
  protected readonly studio = inject(StudioService);

  protected readonly folder = computed(() => folderName(this.studio.state()?.project ?? ''));

  constructor() {
    void this.studio.reload();
  }
}
