import { Injectable, signal } from '@angular/core';

export interface Toast {
  text: string;
  error: boolean;
}

const INFO_MS = 3000;

/** One message at a time. Information leaves after three seconds; an error stays until it is dismissed. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<Toast | undefined>(undefined);
  private timer?: ReturnType<typeof setTimeout>;

  info(text: string): void {
    this.show({ text, error: false });
    this.timer = setTimeout(() => this.dismiss(), INFO_MS);
  }

  error(text: string): void {
    this.show({ text, error: true });
  }

  dismiss(): void {
    clearTimeout(this.timer);
    this.current.set(undefined);
  }

  private show(toast: Toast): void {
    clearTimeout(this.timer);
    this.current.set(toast);
  }
}
