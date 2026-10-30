import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  body: string;
  /** The button that confirms, naming the action and its object, such as `Delete set 2026-10-28-1000/soft`. */
  action: string;
  cancel?: string;
  danger?: boolean;
}

/** One question at a time, answered in a dialog. Replaces `window.confirm`. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<(ConfirmRequest & { resolve: (ok: boolean) => void }) | undefined>(undefined);

  ask(request: ConfirmRequest): Promise<boolean> {
    this.request()?.resolve(false);
    return new Promise((resolve) => this.request.set({ ...request, resolve }));
  }

  answer(ok: boolean): void {
    const request = this.request();
    this.request.set(undefined);
    request?.resolve(ok);
  }
}
