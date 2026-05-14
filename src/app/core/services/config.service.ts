import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ConfigLoadError } from '@core/models/config-error.model';
import { AppConfig } from '@core/models/config.model';
import { SKIP_GLOBAL_ERROR_HANDLER } from '@core/tokens/http-error-context.token';

import { name as appName } from '../../../../package.json';

const REQUIRED_KEYS: (keyof AppConfig)[] = ['apiUrl', 'version'];

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly http = inject(HttpClient);

  // The configuration is loaded once at app startup and then kept in memory, so we can safely use a non-null assertion here
  config!: AppConfig;

  async loadConfig(): Promise<void> {
    let raw: unknown;

    try {
      raw = await firstValueFrom(
        this.http.get<unknown>('config.json', {
          context: new HttpContext().set(SKIP_GLOBAL_ERROR_HANDLER, true),
        })
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        throw new ConfigLoadError(
          'http',
          `Failed to load config.json (HTTP ${error.status})`,
          error.status
        );
      }
      throw new ConfigLoadError('network', 'Network error while loading config.json');
    }

    this.assertValid(raw);
    this.config = raw;
    this.logBanner();
  }

  private assertValid(raw: unknown): asserts raw is AppConfig {
    if (!raw || typeof raw !== 'object') {
      throw new ConfigLoadError('invalid_format', 'config.json is not a valid JSON object');
    }

    const missing = REQUIRED_KEYS.filter(
      (key) => !(key in raw) || (raw as Record<string, unknown>)[key] === null
    );

    if (missing.length > 0) {
      throw new ConfigLoadError(
        'missing_fields',
        `Missing required fields in config.json: ${missing.join(', ')}`,
        undefined,
        missing
      );
    }
  }

  private logBanner(): void {
    const deployedAt = this.config.deployedAt;

    const deployedLabel = deployedAt
      ? `deployed on ${new Intl.DateTimeFormat('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
          timeZone: 'Europe/Paris',
        }).format(new Date(deployedAt))}`
      : 'local server';

    // eslint-disable-next-line no-console
    console.log(
      `%c ${appName} %c v${this.config.version} %c ${deployedLabel} `,
      'background:#6366f1;color:#ffffff;font-weight:800;padding:3px 10px;border-radius:6px 0 0 6px;font-size:11px;letter-spacing:0.5px;text-transform:uppercase',
      'background:#312e81;color:#c7d2fe;font-weight:700;padding:3px 10px;font-size:11px;letter-spacing:0.3px',
      'background:#1e1b4b;color:#818cf8;font-style:italic;padding:3px 10px;border-radius:0 6px 6px 0;font-size:11px'
    );
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  get apiUrl(): string {
    return this.get('apiUrl');
  }
}
