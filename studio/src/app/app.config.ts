import {
  type ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideCheckNoChangesConfig
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideNgxFormidable } from '@cynthion/ngx-formidable';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    ...provideNgxFormidable({ defaults: { labelPosition: 'outside' } }),
    ...(isDevMode() ? [provideCheckNoChangesConfig({ exhaustive: true })] : [])
  ]
};
