import { CdkDrag, type CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { afterNextRender, afterRenderEffect, Component, computed, inject, Injector, signal } from '@angular/core';
import type { Icon } from '../api/api.model';
import { columns, fileUrl, focusMenu, isDrawn } from '../api/studio.helpers';
import { StudioService } from '../api/studio.service';
import type { Unsaved } from '../app.routes';
import { ConfirmService } from '../ui/confirm/confirm.service';
import { ItemMenuComponent, type MenuEntry } from '../ui/item-menu/item-menu.component';
import { PairComponent } from '../ui/pair/pair.component';
import { AddIconDialogComponent } from './add-icon-dialog/add-icon-dialog.component';

/** Every icon with its current file, stem, subject and reference. Icons are added, ordered, edited and removed here. */
@Component({
  selector: 'studio-icons',
  templateUrl: './icons.component.html',
  styleUrl: './icons.component.scss',
  imports: [AddIconDialogComponent, CdkDrag, CdkDragHandle, CdkDropList, ItemMenuComponent, PairComponent]
})
export class IconsComponent implements Unsaved {
  protected readonly studio = inject(StudioService);
  private readonly confirm = inject(ConfirmService);
  private readonly injector = inject(Injector);

  protected readonly fileUrl = fileUrl;
  protected readonly isDrawn = isDrawn;
  private readonly state = computed(() => this.studio.state()!);
  protected readonly current = computed(() => columns(this.state(), [])[0]);
  protected readonly icons = computed(() => this.state().config.icons);
  protected readonly rows = computed(() => {
    const query = this.studio.search().toLowerCase();
    return this.icons().filter(
      (icon) => !query || `${icon.stem} ${isDrawn(icon) ? icon.subject : ''}`.toLowerCase().includes(query)
    );
  });
  /** Icons move in the whole list only: not while a filter hides some, nor while a job draws. */
  protected readonly canMove = computed(() => !this.studio.search() && !this.studio.busy());
  protected readonly announcement = signal('');

  constructor() {
    // a described or added icon's subject field takes the focus once its row shows
    afterRenderEffect(() => {
      this.rows();
      if (this.studio.reveal()) {
        this.revealSubject();
      }
    });
  }

  unsaved(): string | undefined {
    const count = Object.keys(this.studio.drafts()).length;
    return count ? `${count} subject${count > 1 ? 's are' : ' is'}` : undefined;
  }

  discard(): void {
    this.studio.drafts.set({});
  }

  protected entries(icon: Icon, index: number): MenuEntry[] {
    const last = this.icons().length - 1;
    const fixed = !this.canMove();
    const rotations = this.icons()
      .filter((i) => !isDrawn(i) && i.from === icon.stem)
      .map((i) => i.stem);
    return [
      { value: 'up', label: 'Move up', disabled: fixed || index === 0 },
      { value: 'down', label: 'Move down', disabled: fixed || index === last },
      { value: 'top', label: 'Move to top', disabled: fixed || index === 0 },
      { value: 'bottom', label: 'Move to bottom', disabled: fixed || index === last },
      {
        value: 'remove',
        label: rotations.length ? `Remove icon… (remove ${rotations.join(', ')} first)` : 'Remove icon…',
        danger: true,
        separator: true,
        disabled: this.studio.busy() || rotations.length > 0
      }
    ];
  }

  protected act(icon: Icon, index: number, action: string): Promise<void> {
    const to = { up: index - 1, down: index + 1, top: 0, bottom: this.icons().length - 1 }[action];
    return to === undefined ? this.remove(icon) : this.move(index, to);
  }

  protected drop(event: CdkDragDrop<unknown>): Promise<void> | undefined {
    return event.previousIndex === event.currentIndex ? undefined : this.move(event.previousIndex, event.currentIndex);
  }

  /** Writes the new order of the icons; the page shows it at once, before the server answers. */
  private async move(from: number, to: number): Promise<void> {
    const icons = this.icons().filter((_, i) => i !== from);
    const moved = this.icons()[from];
    icons.splice(to, 0, moved);
    this.studio.state.update((state) => state && { ...state, config: { ...state.config, icons } });
    this.announcement.set(`Moved ${moved.stem} to position ${to + 1} of ${icons.length}`);
    afterNextRender(() => focusMenu(moved.stem), { injector: this.injector });
    await this.studio.write('PUT', '/api/icons', { order: icons.map((icon) => icon.stem) });
  }

  private async remove(icon: Icon): Promise<void> {
    const referenced = this.state().references[icon.stem] !== undefined;
    if (
      await this.confirm.ask({
        title: `Remove icon ${icon.stem}?`,
        body: `${icon.stem} leaves aicon-studio.json${referenced ? ' and its reference is deleted' : ''}. Its drawings in the sets and the target stay.`,
        action: `Remove icon ${icon.stem}`,
        danger: true
      })
    ) {
      this.studio.setDraft(icon.stem, undefined);
      await this.studio.write('DELETE', `/api/icons/${icon.stem}`, undefined, `Removed ${icon.stem}`);
    }
  }

  protected draft(icon: Icon): string | undefined {
    return this.studio.drafts()[icon.stem];
  }

  protected edit(icon: Icon, value: string): void {
    this.studio.setDraft(icon.stem, isDrawn(icon) && value === icon.subject ? undefined : value);
  }

  protected async save(icon: Icon): Promise<void> {
    const subject = this.draft(icon)?.trim();
    if (!subject) {
      return;
    }
    const saved = await this.studio.write(
      'PUT',
      `/api/subjects/${icon.stem}`,
      { subject },
      `Saved the subject of ${icon.stem}; the next run or redraw draws from it`
    );
    if (saved) {
      this.studio.setDraft(icon.stem, undefined);
    }
  }

  protected onKeydown(event: KeyboardEvent, icon: Icon): void {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void this.save(icon);
    }
  }

  protected referenceUrl(stem: string): string | undefined {
    const version = this.state().references[stem];
    return version === undefined ? undefined : `url('/files/references/${stem}.svg?v=${version}')`;
  }

  protected holders(stem: string): string {
    const columnsHolding = this.state().referencedIn[stem] ?? [];
    return columnsHolding.map((c) => (c === 'icons' ? 'current icons' : c)).join(', ') || 'in no set';
  }

  protected async removeReference(stem: string): Promise<void> {
    await this.studio.write('DELETE', `/api/references/${stem}`, undefined, `Removed the reference of ${stem}`);
  }

  private revealSubject(): void {
    const stem = this.studio.reveal();
    const field = stem && document.getElementById(`subject-${stem}`);
    if (field) {
      field.scrollIntoView({ block: 'center' });
      field.focus();
      this.studio.reveal.set(undefined);
    }
  }
}
