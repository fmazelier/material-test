import { inject, Injectable } from '@angular/core';

import { ConfigService } from '@mazelab/ng-kit/bootstrap';

import type { AppEnv } from '../models/env.model';

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly config = inject<ConfigService<AppEnv>>(ConfigService);

  get<K extends keyof AppEnv>(key: K): AppEnv[K] {
    return this.config.get(key);
  }

  get apiUrl(): string {
    return this.config.get('apiUrl');
  }
}
