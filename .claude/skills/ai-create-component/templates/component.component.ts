import { Component, input, output } from '@angular/core';

@Component({
  // reusable: studio-ui-name   |   single use: studio-name
  selector: 'studio-name',
  templateUrl: './name.component.html',
  styleUrl: './name.component.scss'
})
export class NameComponent {
  readonly data = input<unknown>();

  readonly submitClick = output<unknown>();
}
