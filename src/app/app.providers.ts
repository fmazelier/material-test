import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  TitleStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
  withPreloading,
  withRouterConfig,
} from '@angular/router';

import { CustomTitleStrategyService } from '@core/services/custom-title-strategy.service';

import { provideDlkRuntimeConfig, provideDlkRuntimeConfigLoader } from 'devlab-ng-kit/bootstrap';
import { httpErrorInterceptor } from 'devlab-ng-kit/interceptor';
import { provideDlkFrenchMaterialDefaults } from 'devlab-ng-kit/material';
import { ThemeService } from 'devlab-ng-kit/service';

import { name as appName, version as appVersion } from '../../package.json';

import { routes } from './app.routes';
import type { AppEnv } from './core/models/env.model';

export function provideAppRuntime(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideDlkRuntimeConfig<AppEnv>({
      requiredKeys: ['apiUrl'],
      appName,
      appVersion,
    }),
    provideDlkRuntimeConfigLoader<AppEnv>(),
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
  ]);
}

export function provideAppUi(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      inject(ThemeService);
    }),
    provideDlkFrenchMaterialDefaults(),
  ]);
}

export function provideAppRouting(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withComponentInputBinding(),
      withRouterConfig({
        paramsInheritanceStrategy: 'always',
      }),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    { provide: TitleStrategy, useClass: CustomTitleStrategyService },
  ]);
}
