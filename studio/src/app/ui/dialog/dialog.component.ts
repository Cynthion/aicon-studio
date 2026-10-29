import { afterNextRender, Component, type ElementRef, input, output, viewChild } from '@angular/core';

let next = 0;

/** A modal `<dialog>`, named by its headline, open while it exists. `closed` answers the value it was closed with. */
@Component({
  selector: 'studio-ui-dialog',
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss'
})
export class DialogComponent {
  readonly headline = input.required<string>();

  readonly closed = output<string>();

  protected readonly headlineId = `dialog-${++next}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  /** Closes the dialog with `value`; Escape and ✕ close it with none. */
  close(value = ''): void {
    this.dialog().nativeElement.close(value);
  }
}
