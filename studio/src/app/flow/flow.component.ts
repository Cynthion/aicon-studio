import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { StudioService } from '../api/studio.service';
import { type FlowStep, flowSteps, nextStep } from '../api/studio.helpers';

const NEW_STYLE = { name: '', prompt: '# New Style\n\nCreate a minimal UI icon of {subject} in …', isNew: true };

/** The setup checklist: what is done, and a button for the next step. Gone once every step is done. */
@Component({
  selector: 'studio-flow',
  templateUrl: './flow.component.html',
  styleUrl: './flow.component.scss'
})
export class FlowComponent {
  private readonly studio = inject(StudioService);
  private readonly router = inject(Router);

  protected readonly steps = computed(() => {
    const state = this.studio.state();
    return state ? flowSteps(state) : [];
  });
  protected readonly next = computed(() => nextStep(this.steps()));

  protected go(step: FlowStep): void {
    switch (step.key) {
      case 'settings':
        return this.studio.dialog.set('settings');
      case 'icons':
        this.studio.dialog.set('add-icon');
        void this.router.navigateByUrl('/icons');
        return;
      case 'styles':
        this.studio.styleDraft.set(NEW_STYLE);
        void this.router.navigateByUrl('/styles');
        return;
      case 'run':
        return this.studio.dialog.set('run');
    }
  }
}
