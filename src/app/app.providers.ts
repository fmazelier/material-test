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

import { provideMlkRuntimeConfig, provideMlkRuntimeConfigLoader } from '@mazelab/ng-kit/bootstrap';
import { httpErrorInterceptor } from '@mazelab/ng-kit/interceptor';
import { provideMlkFrenchMaterialDefaults } from '@mazelab/ng-kit/material';
import { ThemeService } from '@mazelab/ng-kit/service';

import { name as appName, version as appVersion } from '../../package.json';

import { routes } from './app.routes';
import type { AppEnv } from './core/models/env.model';

export function provideAppRuntime(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideMlkRuntimeConfig<AppEnv>({
      requiredKeys: ['apiUrl', 'keycloak'],
      appName,
      appVersion,
    }),
    provideMlkRuntimeConfigLoader<AppEnv>(),
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
  ]);
}

export function provideAppUi(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      inject(ThemeService);
    }),
    provideMlkFrenchMaterialDefaults(),
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
