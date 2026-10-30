/** Focuses the menu button of an item, `Actions for <name>`, such as after a move took its row out of the DOM. */
export const focusMenu = (name: string): void =>
  document.querySelector<HTMLElement>(`studio-ui-item-menu button[aria-label="Actions for ${name}"]`)?.focus();
