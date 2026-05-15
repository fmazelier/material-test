/* eslint-disable @typescript-eslint/no-magic-numbers */
import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { SnackbarService } from '@shared/services/snackbar.service';

import {
  IGNORED_ERROR_STATUSES,
  SKIP_GLOBAL_ERROR_HANDLER,
} from '../tokens/http-error-context.token';

import { httpErrorInterceptor } from './http-error.interceptor';

describe('httpErrorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let snackbarSpy: { error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    snackbarSpy = { error: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: SnackbarService, useValue: snackbarSpy },
        { provide: MatSnackBar, useValue: {} },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should show snackbar for 500 error with mapped message', () => {
    http.get('/api/test').subscribe({ error: () => {} });

    httpMock
      .expectOne('/api/test')
      .flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(snackbarSpy.error).toHaveBeenCalledWith(
      'Une erreur interne est survenue. Veuillez réessayer plus tard.'
    );
  });

  it('should show network error message for status 0', () => {
    http.get('/api/test').subscribe({ error: () => {} });

    httpMock
      .expectOne('/api/test')
      .error(new ProgressEvent('error'), { status: 0, statusText: '' });

    expect(snackbarSpy.error).toHaveBeenCalledWith(
      'Impossible de se connecter au serveur. Vérifiez votre connexion.'
    );
  });

  it('should show default message for unmapped status codes', () => {
    http.get('/api/test').subscribe({ error: () => {} });

    httpMock.expectOne('/api/test').flush(null, { status: 418, statusText: "I'm a teapot" });

    expect(snackbarSpy.error).toHaveBeenCalledWith("Une erreur inattendue s'est produite.");
  });

  it('should show specific message for 400', () => {
    http.get('/api/test').subscribe({ error: () => {} });
    httpMock.expectOne('/api/test').flush(null, { status: 400, statusText: 'Bad Request' });

    expect(snackbarSpy.error).toHaveBeenCalledWith(
      "La demande n'a pas pu être comprise par le serveur."
    );
  });

  it('should show specific message for 401', () => {
    http.get('/api/test').subscribe({ error: () => {} });
    httpMock.expectOne('/api/test').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(snackbarSpy.error).toHaveBeenCalledWith(
      'Vous devez être connecté pour accéder à cette ressource.'
    );
  });

  it('should show specific message for 403', () => {
    http.get('/api/test').subscribe({ error: () => {} });
    httpMock.expectOne('/api/test').flush(null, { status: 403, statusText: 'Forbidden' });

    expect(snackbarSpy.error).toHaveBeenCalledWith(
      "Vous n'avez pas l'autorisation d'accéder à cette ressource."
    );
  });

  it('should show specific message for 404', () => {
    http.get('/api/test').subscribe({ error: () => {} });
    httpMock.expectOne('/api/test').flush(null, { status: 404, statusText: 'Not Found' });

    expect(snackbarSpy.error).toHaveBeenCalledWith(
      "Nous n'avons pas pu trouver la ressource demandée."
    );
  });

  it('should show specific message for 503', () => {
    http.get('/api/test').subscribe({ error: () => {} });
    httpMock.expectOne('/api/test').flush(null, { status: 503, statusText: 'Service Unavailable' });

    expect(snackbarSpy.error).toHaveBeenCalledWith('Le service est temporairement indisponible.');
  });

  it('should skip error handling when SKIP_GLOBAL_ERROR_HANDLER is set', () => {
    http
      .get('/api/test', {
        context: new HttpContext().set(SKIP_GLOBAL_ERROR_HANDLER, true),
      })
      .subscribe({ error: () => {} });

    httpMock.expectOne('/api/test').flush(null, { status: 500, statusText: 'Error' });

    expect(snackbarSpy.error).not.toHaveBeenCalled();
  });

  it('should skip error handling for ignored status codes', () => {
    http
      .get('/api/test', {
        context: new HttpContext().set(IGNORED_ERROR_STATUSES, [404]),
      })
      .subscribe({ error: () => {} });

    httpMock.expectOne('/api/test').flush(null, { status: 404, statusText: 'Not Found' });

    expect(snackbarSpy.error).not.toHaveBeenCalled();
  });

  it('should still show error for non-ignored status codes', () => {
    http
      .get('/api/test', {
        context: new HttpContext().set(IGNORED_ERROR_STATUSES, [404]),
      })
      .subscribe({ error: () => {} });

    httpMock.expectOne('/api/test').flush(null, { status: 500, statusText: 'Error' });

    expect(snackbarSpy.error).toHaveBeenCalled();
  });

  it('should re-throw the error to the subscriber', () => {
    let caughtError: HttpErrorResponse | undefined;

    http.get('/api/test').subscribe({ error: (e) => (caughtError = e) });

    httpMock.expectOne('/api/test').flush(null, { status: 400, statusText: 'Bad Request' });

    expect(caughtError).toBeInstanceOf(HttpErrorResponse);
    expect(caughtError?.status).toBe(400);
  });

  it('should pass through successful requests', () => {
    let result: unknown;
    http.get('/api/test').subscribe((r) => (result = r));

    httpMock.expectOne('/api/test').flush({ data: 'ok' });

    expect(result).toEqual({ data: 'ok' });
    expect(snackbarSpy.error).not.toHaveBeenCalled();
  });
});
