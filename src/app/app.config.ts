import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import {
  ApplicationConfig,
  inject,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  TitleStrategy,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';

import { ConfigService } from '@core/services/config.service';
import { CustomTitleStrategyService } from '@core/services/custom-title-strategy.service';
import { ThemeService } from '@core/services/theme.service';

import { routes } from './app.routes';

registerLocaleData(localeFr, 'fr-FR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => {
      const configService = inject(ConfigService);
      return configService.loadConfig();
    }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    provideZonelessChangeDetection(),
    provideEnvironmentInitializer(() => {
      inject(ThemeService);
    }),
    { provide: TitleStrategy, useClass: CustomTitleStrategyService },
    { provide: LOCALE_ID, useValue: 'fr-FR' },
  ],
};
