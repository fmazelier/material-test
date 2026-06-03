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

import { ConfigLoadError } from './config-error.model';
import type { KeycloakRuntimeConfig } from './keycloak-runtime-config.model';
import { assertBoolean, assertNonEmptyString, assertRecord } from './runtime-config.validators';

export function assertKeycloakRuntimeConfig(
  value: unknown,
  field = 'keycloak',
): asserts value is KeycloakRuntimeConfig {
  assertRecord(value, field);

  assertNonEmptyString(value['url'], `${field}.url`);
  assertNonEmptyString(value['realm'], `${field}.realm`);
  assertNonEmptyString(value['clientId'], `${field}.clientId`);

  const initOptions = value['initOptions'];
  if (initOptions === undefined) {
    return;
  }

  assertRecord(initOptions, `${field}.initOptions`);

  const onLoad = initOptions['onLoad'];
  if (onLoad !== undefined && onLoad !== 'check-sso' && onLoad !== 'login-required') {
    throw new ConfigLoadError(
      'invalid_format',
      `Invalid env.json: "${field}.initOptions.onLoad" must be "check-sso" or "login-required"`,
    );
  }

  const pkceMethod = initOptions['pkceMethod'];
  if (pkceMethod !== undefined && pkceMethod !== 'S256' && pkceMethod !== false) {
    throw new ConfigLoadError(
      'invalid_format',
      `Invalid env.json: "${field}.initOptions.pkceMethod" must be "S256" or false`,
    );
  }

  const checkLoginIframe = initOptions['checkLoginIframe'];
  if (checkLoginIframe !== undefined) {
    assertBoolean(checkLoginIframe, `${field}.initOptions.checkLoginIframe`);
  }

  const silentUri = initOptions['silentCheckSsoRedirectUri'];
  if (silentUri !== undefined) {
    assertNonEmptyString(silentUri, `${field}.initOptions.silentCheckSsoRedirectUri`);
  }
}


function assertAppRuntimeConfig(raw: unknown): asserts raw is AppEnv {
  assertRecord(raw, 'env');

  assertNonEmptyString(raw['apiUrl'], 'apiUrl');
  assertKeycloakRuntimeConfig(raw['keycloak'], 'keycloak');
}

export function provideAppRuntime(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideDlkRuntimeConfig<AppEnv>({
      requiredKeys: ['apiUrl', 'keycloak'],
      appName,
      appVersion,
      validate: assertAppRuntimeConfig,
    }),
    provideDlkRuntimeConfigLoader<AppEnv>(),
    provideHttpClient(withInterceptors([httpErrorInterceptor, authInterceptor])),
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
