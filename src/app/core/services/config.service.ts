import { APP_BASE_HREF } from '@angular/common';
import { inject, Injectable } from '@angular/core';

import { AppConfig } from '@core/models/config.model';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly baseHref = inject(APP_BASE_HREF);

  private config!: AppConfig;

  async loadConfig(): Promise<void> {
    const response = await fetch(`${this.baseHref}config.json`);
    if (!response.ok) {
      throw new Error(
        "[Config] échec du chargement du fichier de configuration nécessaire au bon fonctionnement de l'app"
      );
    }
    this.config = await response.json();
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  get apiUrl(): string {
    return this.get('apiUrl');
  }
}
