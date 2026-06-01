import { TestBed } from '@angular/core/testing';

import { ConfigService } from 'devlab-ng-kit/bootstrap';

import { vi } from 'vitest';

import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  let service: AppConfigService;

  const configServiceMock = {
    get: vi.fn((key: string) => {
      if (key === 'apiUrl') {
        return 'https://api.example.com';
      }

      return undefined;
    }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppConfigService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    });

    service = TestBed.inject(AppConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should delegate get to ConfigService', () => {
    expect(service.get('apiUrl')).toBe('https://api.example.com');
    expect(configServiceMock.get).toHaveBeenCalledWith('apiUrl');
  });

  it('should expose apiUrl getter', () => {
    expect(service.apiUrl).toBe('https://api.example.com');
    expect(configServiceMock.get).toHaveBeenCalledWith('apiUrl');
  });
});
