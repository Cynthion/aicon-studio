import { afterNextRender, Component, type ElementRef, input, output, viewChild } from '@angular/core';

let next = 0;

/** A modal `<dialog>`, named by its headline, open while it exists; Escape, ✕ and a click on the backdrop close it. `closed` answers the value it was closed with. */
@Component({
  selector: 'studio-ui-dialog',
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss'
})
export class DialogComponent {
  readonly headline = input.required<string>();

  readonly closed = output<string>();

  protected readonly headlineId = `dialog-${++next}`;
  /** A press that starts in a field and ends on the backdrop is a text selection, not a click on the backdrop. */
  private pressedOnBackdrop = false;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  /** Closes the dialog with `value`; Escape and ✕ close it with none. */
  close(value = ''): void {
    this.dialog().nativeElement.close(value);
  }

  // the handlers return nothing: a template handler that returns false cancels the event, a click on a submit button included
  protected press(event: MouseEvent): void {
    this.pressedOnBackdrop = event.target === this.dialog().nativeElement;
  }

  protected clickBackdrop(event: MouseEvent): void {
    if (this.pressedOnBackdrop && event.target === this.dialog().nativeElement) {
      this.close();
    }
  }
}
