import { Component, type ElementRef, forwardRef, input, model, viewChild } from '@angular/core';
import { BaseField, type FieldDecoratorLayout, FORMIDABLE_FIELD } from '@cynthion/ngx-formidable';

/** A secret typed into a field that hides it, unless `revealed`. The library's input field has no password type. */
@Component({
  selector: 'studio-password-field',
  templateUrl: './password-field.component.html',
  styleUrl: './password-field.component.scss',
  providers: [{ provide: FORMIDABLE_FIELD, useExisting: forwardRef(() => PasswordFieldComponent) }]
})
export class PasswordFieldComponent extends BaseField<string> {
  readonly value = model('');
  readonly revealed = input(false);

  private readonly editorRef = viewChild.required<ElementRef<HTMLInputElement>>('editorRef');

  protected keyboardCallback = null;
  protected registeredKeys: string[] = [];
  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  get fieldRef(): ElementRef<HTMLElement> {
    return this.editorRef();
  }

  protected doOnFocusChange(): void {
    // nothing beyond the base
  }

  protected onInput(): void {
    this.setValue(this.editorRef().nativeElement.value);
  }
}
