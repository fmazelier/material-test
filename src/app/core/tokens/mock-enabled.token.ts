import { InjectionToken, isDevMode } from '@angular/core';

/**
 * Token for enabling or disabling mock services.
 * By default, follows `isDevMode()`: `true` in development, `false` in production.
 * Can be overridden in tests or application providers.
 */
export const MOCK_ENABLED = new InjectionToken<boolean>('MOCK_ENABLED', {
  factory: () => isDevMode(),
});
