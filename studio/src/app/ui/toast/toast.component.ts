import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'studio-ui-toast',
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent {
  protected readonly toasts = inject(ToastService);
}
