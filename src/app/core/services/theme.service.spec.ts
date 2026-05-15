import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  let addEventListenerSpy: ReturnType<typeof vi.fn<(type: string, listener: Function) => void>>;
  let matchMediaResult: { matches: boolean; addEventListener: typeof addEventListenerSpy };
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    localStorage.clear();

    addEventListenerSpy = vi.fn();
    matchMediaResult = { matches: false, addEventListener: addEventListenerSpy };

    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi
      .fn()
      .mockReturnValue(matchMediaResult) as unknown as typeof window.matchMedia;

    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.documentElement.classList.remove('dark');
  });

  function createService(): ThemeService {
    return TestBed.inject(ThemeService);
  }

  describe('initial theme', () => {
    it('should default to light when no stored preference and no system dark mode', () => {
      service = createService();
      expect(service.currentTheme()).toBe('light');
      expect(service.isDark()).toBe(false);
    });

    it('should use stored theme from localStorage', () => {
      localStorage.setItem('theme', 'dark');
      service = createService();
      expect(service.currentTheme()).toBe('dark');
      expect(service.isDark()).toBe(true);
    });

    it('should detect system dark mode when no stored preference', () => {
      matchMediaResult.matches = true;
      service = createService();
      expect(service.currentTheme()).toBe('dark');
    });

    it('should prefer stored theme over system preference', () => {
      localStorage.setItem('theme', 'light');
      matchMediaResult.matches = true;
      service = createService();
      expect(service.currentTheme()).toBe('light');
    });
  });

  describe('toggle', () => {
    it('should switch from light to dark', () => {
      service = createService();
      service.toggle();
      expect(service.currentTheme()).toBe('dark');
      expect(service.isDark()).toBe(true);
    });

    it('should switch from dark to light', () => {
      localStorage.setItem('theme', 'dark');
      service = createService();
      service.toggle();
      expect(service.currentTheme()).toBe('light');
      expect(service.isDark()).toBe(false);
    });

    it('should persist preference to localStorage', () => {
      service = createService();
      service.toggle();
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  describe('system theme listener', () => {
    it('should register a listener for prefers-color-scheme changes', () => {
      service = createService();
      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should update theme when system preference changes and no user preference', () => {
      service = createService();
      const changeHandler = addEventListenerSpy.mock.calls[0][1] as (e: {
        matches: boolean;
      }) => void;

      changeHandler({ matches: true });
      expect(service.currentTheme()).toBe('dark');

      changeHandler({ matches: false });
      expect(service.currentTheme()).toBe('light');
    });

    it('should not override user preference on system change', () => {
      service = createService();
      service.toggle();
      expect(service.currentTheme()).toBe('dark');

      const changeHandler = addEventListenerSpy.mock.calls[0][1] as (e: {
        matches: boolean;
      }) => void;
      changeHandler({ matches: false });

      expect(service.currentTheme()).toBe('dark');
    });
  });

  describe('isDark computed', () => {
    it('should be true when theme is dark', () => {
      localStorage.setItem('theme', 'dark');
      service = createService();
      expect(service.isDark()).toBe(true);
    });

    it('should be false when theme is light', () => {
      service = createService();
      expect(service.isDark()).toBe(false);
    });
  });
});
