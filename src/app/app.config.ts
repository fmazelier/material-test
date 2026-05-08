import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
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
  withInMemoryScrolling,
  withPreloading,
} from '@angular/router';

import { httpErrorInterceptor } from '@core/interceptors/http-error.interceptor';
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
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withComponentInputBinding(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      })
    ),
    provideZonelessChangeDetection(),
    provideEnvironmentInitializer(() => {
      inject(ThemeService);
    }),
    { provide: TitleStrategy, useClass: CustomTitleStrategyService },
    { provide: LOCALE_ID, useValue: 'fr-FR' },
  ],
};

// eslint-disable-next-line no-console
console.log('AppConfig loaded:', appConfig);
