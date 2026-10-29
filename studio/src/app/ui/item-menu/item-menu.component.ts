import { Component, input, output } from '@angular/core';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@angular/aria/menu';

export interface MenuEntry {
  value: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  /** A checkbox entry, checked or not. */
  checked?: boolean;
  /** A line before the entry, which starts a group. */
  separator?: boolean;
}

/** A menu button: ⋯ named by `ariaLabel`, or the visible `text`. Choosing an entry closes it and refocuses the button. */
@Component({
  selector: 'studio-ui-item-menu',
  templateUrl: './item-menu.component.html',
  styleUrl: './item-menu.component.scss',
  imports: [Menu, MenuContent, MenuItem, MenuTrigger]
})
export class ItemMenuComponent {
  readonly entries = input.required<MenuEntry[]>();
  readonly text = input<string>();
  readonly ariaLabel = input<string>();
  readonly align = input<'left' | 'right'>('right');

  readonly selected = output<string>();
}
