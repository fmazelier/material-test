import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';

import { provideAppRouting, provideAppRuntime, provideAppUi } from './app.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppRuntime(),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAppUi(),
    provideAppRouting(),
  ],
};
