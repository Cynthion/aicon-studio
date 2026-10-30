import { CdkDrag, type CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { afterNextRender, Component, computed, inject, Injector, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { Icon } from '../api/api.model';
import {
  cellState,
  columns,
  costLabel,
  fileUrl,
  ICONS_COLUMN,
  isDrawn,
  missingStems,
  reorder
} from '../api/studio.helpers';
import { StudioService } from '../api/studio.service';
import type { Column } from '../api/studio.model';
import { ConfirmService } from '../ui/confirm/confirm.service';
import { ItemMenuComponent, type MenuEntry } from '../ui/item-menu/item-menu.component';
import { focusMenu } from '../ui/item-menu/item-menu.helpers';
import { PairComponent } from '../ui/pair/pair.component';
import { IconPanelComponent } from './icon-panel/icon-panel.component';

const SIZES = [16, 24, 32, 48, 64];

/** Every icon as a row, the current icons and every set as columns, and the icon panel of the chosen cell. */
@Component({
  selector: 'studio-sets',
  templateUrl: './sets.component.html',
  styleUrl: './sets.component.scss',
  imports: [CdkDrag, CdkDragHandle, CdkDropList, IconPanelComponent, ItemMenuComponent, PairComponent]
})
export class SetsComponent {
  protected readonly studio = inject(StudioService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly sizes = SIZES;
  protected readonly cellState = cellState;
  protected readonly fileUrl = fileUrl;
  protected readonly state = computed(() => this.studio.state()!);
  protected readonly job = computed(() => this.state().job);
  private readonly all = computed(() => columns(this.state(), this.studio.prefs().order));
  protected readonly visible = computed(() => this.all().filter((c) => !this.studio.prefs().hidden.includes(c.id)));
  /** The visible set columns, the ones that move. */
  private readonly movable = computed(() => this.visible().filter((c) => c.info));
  protected readonly rows = computed(() => {
    const query = this.studio.search().toLowerCase();
    return this.state().config.icons.filter(
      (icon) => !query || `${icon.stem} ${isDrawn(icon) ? icon.subject : ''}`.toLowerCase().includes(query)
    );
  });
  protected readonly columnEntries = computed<MenuEntry[]>(() =>
    this.all().map((c) => ({
      value: c.id,
      label: c.id === ICONS_COLUMN ? 'current icons' : c.id,
      checked: !this.studio.prefs().hidden.includes(c.id)
    }))
  );
  protected readonly selection = computed(() => {
    const selected = this.studio.selected();
    const column = this.all().find((c) => c.id === selected?.column);
    const icon = this.state().config.icons.find((i) => i.stem === selected?.stem);
    return column && icon ? { column, icon } : undefined;
  });
  protected readonly announcement = signal('');

  protected subjectOf(icon: Icon): string {
    return isDrawn(icon) ? icon.subject : `rotation of ${icon.from}`;
  }

  protected referenceUrl(stem: string): string | undefined {
    const version = this.state().references[stem];
    return version === undefined ? undefined : `url('/files/references/${stem}.svg?v=${version}')`;
  }

  protected isReference(column: Column, stem: string): boolean {
    return this.state().referencedIn[stem]?.includes(column.id) ?? false;
  }

  protected isSelected(column: Column, stem: string): boolean {
    const selected = this.studio.selected();
    return selected?.column === column.id && selected.stem === stem;
  }

  protected entries(column: Column): MenuEntry[] {
    const busy = this.studio.busy();
    const index = this.movable().indexOf(column);
    const missing = missingStems(this.state(), column);
    return [
      ...(missing.length
        ? [
            {
              value: 'complete',
              label: `Complete set: ${missing.length} icon${missing.length === 1 ? '' : 's'}${costLabel(this.state(), missing)}`,
              disabled: busy
            }
          ]
        : []),
      { value: 'style-from', label: 'New style from this prompt' },
      { value: 'adopt', label: `Adopt into ${this.state().target}…`, disabled: busy },
      { value: 'left', label: 'Move left', separator: true, disabled: index <= 0 },
      { value: 'right', label: 'Move right', disabled: index === this.movable().length - 1 },
      { value: 'hide', label: 'Hide column' },
      { value: 'delete', label: 'Delete set…', danger: true, separator: true, disabled: busy }
    ];
  }

  protected async act(column: Column, action: string): Promise<void> {
    const set = column.id;
    switch (action) {
      case 'complete':
        await this.studio.write('POST', '/api/redraw', { set, stems: missingStems(this.state(), column) });
        return;
      case 'style-from':
        this.studio.styleDraft.set({ name: `${column.info!.style}-2`, prompt: column.info!.prompt, isNew: true });
        await this.router.navigateByUrl('/styles');
        return;
      case 'adopt':
        if (
          await this.confirm.ask({
            title: `Adopt ${set}?`,
            body: `Every SVG file of the set is copied into ${this.state().target}, overwriting the files there.`,
            action: `Adopt ${set}`
          })
        ) {
          await this.studio.write('POST', '/api/adopt', { set }, `Adopted ${set}`);
        }
        return;
      case 'left':
      case 'right':
        return this.move(set, action === 'left' ? -1 : 1);
      case 'hide':
        return this.toggleColumn(set);
      case 'delete':
        if (
          await this.confirm.ask({
            title: `Delete ${set}?`,
            body: 'The set folder and every drawing in it are deleted.',
            action: `Delete set ${set}`,
            danger: true
          })
        ) {
          this.studio.selected.set(undefined);
          await this.studio.write('DELETE', `/api/sets/${set}`, undefined, `Deleted ${set}`);
        }
        return;
    }
  }

  protected toggleColumn(id: string): void {
    const { hidden } = this.studio.prefs();
    this.studio.updatePrefs({ hidden: hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id] });
  }

  protected drop(event: CdkDragDrop<unknown>): void {
    if (event.previousIndex !== event.currentIndex) {
      this.reorderTo(event.previousIndex, event.currentIndex);
    }
  }

  private move(id: string, by: number): void {
    const from = this.movable().findIndex((c) => c.id === id);
    this.reorderTo(from, from + by);
  }

  private reorderTo(from: number, to: number): void {
    const ids = this.movable().map((c) => c.id);
    const hidden = this.all()
      .filter((c) => c.info && !ids.includes(c.id))
      .map((c) => c.id);
    this.studio.updatePrefs({ order: reorder(ids, hidden, from, to) });
    this.announcement.set(`Moved ${ids[from]} to position ${to + 1} of ${ids.length}`);
    afterNextRender(() => focusMenu(ids[from]), { injector: this.injector });
  }
}
