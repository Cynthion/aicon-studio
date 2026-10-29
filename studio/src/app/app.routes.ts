import { inject } from '@angular/core';
import type { Routes } from '@angular/router';
import { IconsComponent } from './icons/icons.component';
import { SetsComponent } from './sets/sets.component';
import { StylesComponent } from './styles/styles.component';
import { ConfirmService } from './ui/confirm/confirm.service';

/** A view holding edits that are not saved yet. */
export interface Unsaved {
  /** What is unsaved, such as `2 subjects`, or nothing. */
  unsaved(): string | undefined;
  discard(): void;
}

/** Leaving a view with unsaved edits asks first. */
const leave = async (view: Unsaved): Promise<boolean> => {
  const unsaved = view.unsaved();
  if (!unsaved) {
    return true;
  }
  const discard = await inject(ConfirmService).ask({
    title: 'Discard unsaved changes?',
    body: `${unsaved} not saved yet.`,
    action: 'Discard',
    cancel: 'Keep editing',
    danger: true
  });
  if (discard) {
    view.discard();
  }
  return discard;
};

export const routes: Routes = [
  { path: 'icons', component: IconsComponent, canDeactivate: [leave] },
  { path: 'styles', component: StylesComponent, canDeactivate: [leave] },
  { path: 'sets', component: SetsComponent },
  { path: '**', redirectTo: 'sets' }
];
