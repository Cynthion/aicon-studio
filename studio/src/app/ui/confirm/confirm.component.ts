import { Component, inject } from '@angular/core';
import { DialogComponent } from '../dialog/dialog.component';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'studio-ui-confirm',
  templateUrl: './confirm.component.html',
  styleUrl: './confirm.component.scss',
  imports: [DialogComponent]
})
export class ConfirmComponent {
  protected readonly confirm = inject(ConfirmService);
}
