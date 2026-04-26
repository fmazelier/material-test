import { effect, Injectable, signal } from '@angular/core';

type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly theme = signal<Theme>(this.getInitialTheme());

  constructor() {
    console.log('initial theme', this.theme());
    effect(() => {
      const isDark = this.theme() === 'dark';

      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem('theme', this.theme());
    });

    this.listenToSystemTheme();
  }

  toggle() {
    this.theme.update(t => (t === 'dark' ? 'light' : 'dark'));
  }

  set(theme: Theme) {
    this.theme.set(theme);
  }

  isDark() {
    return this.theme() === 'dark';
  }

  private getInitialTheme(): Theme {
    const stored = localStorage.getItem('theme') as Theme | null;

    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  private listenToSystemTheme() {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    media.addEventListener('change', e => {
      // change nothing if the user has explicitly chosen a theme
      if (!localStorage.getItem('theme')) {
        this.set(e.matches ? 'dark' : 'light');
      }
    });
  }
}
