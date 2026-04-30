import { computed, effect, Injectable, signal } from '@angular/core';

type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly theme = signal<Theme>(this.getInitialTheme());

  readonly currentTheme = this.theme.asReadonly();
  readonly isDark = computed(() => this.currentTheme() === 'dark');

  constructor() {
    effect(() => {
      const theme = this.theme();
      document.documentElement.classList.toggle('dark', this.isDark());

      // persist only if explicitly chosen
      if (this.isUserPreference) {
        localStorage.setItem('theme', theme);
      }
    });

    this.listenToSystemTheme();
  }

  toggle(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    this.theme.set(next);
  }

  private get isUserPreference(): boolean {
    return localStorage.getItem('theme') !== null;
  }

  private set(theme: Theme): void {
    this.theme.set(theme);
  }

  private getInitialTheme(): Theme {
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
