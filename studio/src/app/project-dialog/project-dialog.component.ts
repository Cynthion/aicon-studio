import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { form, FormField, FormRoot, required, schema } from '@angular/forms/signals';
import { FieldDecorator, FieldLabel, InputField } from '@cynthion/ngx-formidable';
import { ApiError, ApiService } from '../api/api.service';
import { messageOf } from '../api/studio.helpers';
import { StudioService } from '../api/studio.service';
import { DialogComponent } from '../ui/dialog/dialog.component';
import { ToastService } from '../ui/toast/toast.service';

interface ProjectModel {
  dir: string;
}

/** Opens another project folder: one opened before, a typed path, or one chosen in the folder picker. */
@Component({
  selector: 'studio-project-dialog',
  templateUrl: './project-dialog.component.html',
  styleUrl: './project-dialog.component.scss',
  imports: [DialogComponent, FieldDecorator, FieldLabel, FormField, FormRoot, InputField]
})
export class ProjectDialogComponent {
  protected readonly studio = inject(StudioService);
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);

  private readonly dialog = viewChild.required(DialogComponent);

  protected readonly recent = computed(() =>
    this.studio.prefs().projects.filter((dir) => dir !== this.studio.state()?.project)
  );
  protected readonly browsing = signal(false);
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly model = signal<ProjectModel>({ dir: this.studio.state()?.project ?? '' });
  protected readonly form = form(
    this.model,
    schema<ProjectModel>((path) => required(path.dir, { message: 'Enter the folder that holds aicon-studio.json' })),
    { submission: { action: () => this.open(this.model().dir.trim()) } }
  );

  protected async browse(): Promise<void> {
    this.browsing.set(true);
    this.error.set(undefined);
    try {
      const { dir } = await this.api.send<{ dir: string | null }>('POST', '/api/pick-folder');
      if (dir) {
        this.model.set({ dir });
      }
    } catch (e) {
      this.error.set(messageOf(e));
    } finally {
      this.browsing.set(false);
    }
  }

  protected async open(dir: string): Promise<undefined> {
    this.error.set(undefined);
    try {
      await this.api.send('PUT', '/api/project', { dir });
    } catch (e) {
      // a folder that is no project any more leaves the recent list
      if (e instanceof ApiError && e.status === 400) {
        this.studio.forget(dir);
      }
      this.error.set(messageOf(e));
      return;
    }
    this.studio.selected.set(undefined);
    this.studio.drafts.set({});
    this.studio.styleDraft.set(undefined);
    this.studio.search.set('');
    this.studio.updatePrefs({ hidden: [], order: [] });
    await this.studio.reload();
    this.toasts.info(`Opened ${dir}`);
    this.dialog().close('opened');
  }
}
