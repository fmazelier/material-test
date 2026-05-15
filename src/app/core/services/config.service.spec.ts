/* eslint-disable @typescript-eslint/no-magic-numbers */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ConfigLoadError } from '@core/models/config-error.model';

import { ConfigService } from './config.service';

describe('ConfigService', () => {
  let service: ConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('loadConfig', () => {
    it('should load and store a valid config', async () => {
      const validConfig = { apiUrl: 'https://api.test.com', version: '1.0.0', deployedAt: null };

      const promise = service.loadConfig();
      httpMock.expectOne('config.json').flush(validConfig);
      await promise;

      expect(service.config).toEqual(validConfig);
    });

    it('should expose apiUrl via getter', async () => {
      const validConfig = { apiUrl: 'https://api.test.com', version: '1.0.0', deployedAt: null };

      const promise = service.loadConfig();
      httpMock.expectOne('config.json').flush(validConfig);
      await promise;

      expect(service.apiUrl).toBe('https://api.test.com');
    });

    it('should throw ConfigLoadError with code "http" on HTTP error', async () => {
      const promise = service.loadConfig();
      httpMock.expectOne('config.json').flush(null, { status: 404, statusText: 'Not Found' });

      await expect(promise).rejects.toThrow(ConfigLoadError);

      try {
        await promise;
      } catch (e) {
        expect(e).toBeInstanceOf(ConfigLoadError);
        expect((e as ConfigLoadError).code).toBe('http');
        expect((e as ConfigLoadError).httpStatus).toBe(404);
      }
    });

    it('should throw ConfigLoadError with code "http" and status 0 on network error', async () => {
      const promise = service.loadConfig();
      httpMock
        .expectOne('config.json')
        .error(new ProgressEvent('error'), { status: 0, statusText: '' });

      try {
        await promise;
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ConfigLoadError);
        expect((e as ConfigLoadError).code).toBe('http');
        expect((e as ConfigLoadError).httpStatus).toBe(0);
      }
    });

    it('should throw ConfigLoadError with code "invalid_format" for non-object response', async () => {
      const promise = service.loadConfig();
      httpMock.expectOne('config.json').flush('not an object');

      try {
        await promise;
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ConfigLoadError);
        expect((e as ConfigLoadError).code).toBe('invalid_format');
      }
    });

    it('should throw ConfigLoadError with code "invalid_format" for null response', async () => {
      const promise = service.loadConfig();
      httpMock.expectOne('config.json').flush(null);

      try {
        await promise;
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ConfigLoadError);
        expect((e as ConfigLoadError).code).toBe('invalid_format');
      }
    });

    it('should throw ConfigLoadError with code "missing_fields" when apiUrl is missing', async () => {
      const promise = service.loadConfig();
      httpMock.expectOne('config.json').flush({ version: '1.0.0', deployedAt: null });

      try {
        await promise;
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ConfigLoadError);
        const error = e as ConfigLoadError;
        expect(error.code).toBe('missing_fields');
        expect(error.missingFields).toContain('apiUrl');
      }
    });

    it('should throw ConfigLoadError with code "missing_fields" when version is missing', async () => {
      const promise = service.loadConfig();
      httpMock.expectOne('config.json').flush({ apiUrl: 'https://api.test.com', deployedAt: null });

      try {
        await promise;
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ConfigLoadError);
        const error = e as ConfigLoadError;
        expect(error.code).toBe('missing_fields');
        expect(error.missingFields).toContain('version');
      }
    });

    it('should treat null field values as missing', async () => {
      const promise = service.loadConfig();
      httpMock.expectOne('config.json').flush({ apiUrl: null, version: '1.0.0', deployedAt: null });

      try {
        await promise;
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ConfigLoadError);
        expect((e as ConfigLoadError).code).toBe('missing_fields');
      }
    });

    it('should skip global error handler via HttpContext', async () => {
      const validConfig = { apiUrl: 'https://api.test.com', version: '1.0.0', deployedAt: null };

      const promise = service.loadConfig();
      const req = httpMock.expectOne('config.json');

      expect(req.request.context).toBeDefined();
      req.flush(validConfig);
      await promise;
    });
  });

  describe('get', () => {
    it('should return the value for a given config key', async () => {
      const validConfig = {
        apiUrl: 'https://api.test.com',
        version: '2.0.0',
        deployedAt: '2025-01-01',
      };

      const promise = service.loadConfig();
      httpMock.expectOne('config.json').flush(validConfig);
      await promise;

      expect(service.get('version')).toBe('2.0.0');
      expect(service.get('deployedAt')).toBe('2025-01-01');
    });
  });
});
