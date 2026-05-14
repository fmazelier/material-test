import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly theme = signal<Theme>(this.getInitialTheme());

  readonly currentTheme = this.theme.asReadonly();
  readonly isDark = computed(() => this.currentTheme() === 'dark');

  constructor() {
    effect(() => {
      const theme = this.theme();
      if (!this.isBrowser) return;

      document.documentElement.classList.toggle('dark', this.isDark());

      // persist only if explicitly chosen
      if (this.isUserPreference) {
        localStorage.setItem('theme', theme);
      }
    });

    if (this.isBrowser) {
      this.listenToSystemTheme();
    }
  }

  toggle(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    if (this.isBrowser) {
      localStorage.setItem('theme', next);
    }
    this.theme.set(next);
  }

  private get isUserPreference(): boolean {
    return this.isBrowser && localStorage.getItem('theme') !== null;
  }

  private set(theme: Theme): void {
    this.theme.set(theme);
  }

  private getInitialTheme(): Theme {
    if (!this.isBrowser) return 'light';

    const stored = localStorage.getItem('theme') as Theme | null;

    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  private listenToSystemTheme(): void {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    media.addEventListener('change', (e) => {
      // change nothing if the user has explicitly chosen a theme
      if (!this.isUserPreference) {
        this.set(e.matches ? 'dark' : 'light');
      }
    });
  }
}
