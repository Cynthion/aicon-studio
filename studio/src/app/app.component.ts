import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { StudioService } from './api/studio.service';
import { flowSteps, folderName, nextStep } from './api/studio.helpers';
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
  protected readonly tabs = computed(() => {
    const state = this.studio.state();
    return state
      ? [
          { path: '/icons', label: 'Icons', count: state.config.icons.length, step: 'icons' },
          { path: '/styles', label: 'Styles', count: state.styles.length, step: 'styles' },
          { path: '/sets', label: 'Sets', count: state.sets.length, step: 'run' }
        ]
      : [];
  });
  /** The first setup step not done yet, marked with a dot on its tab or on Settings. */
  protected readonly next = computed(() => {
    const state = this.studio.state();
    return state && nextStep(flowSteps(state))?.key;
  });

  constructor() {
    void this.studio.reload();
  }
}
