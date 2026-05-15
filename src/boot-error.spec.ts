import { HttpStatusCode } from '@angular/common/http';

import { ConfigLoadError } from './app/core/models/config-error.model';
import { renderBootError } from './boot-error';

describe('renderBootError', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should render network error with reload button', () => {
    renderBootError(new ConfigLoadError('network', 'Network error'));

    expect(document.body.innerHTML).toContain('Connexion impossible');
    expect(document.body.innerHTML).toContain('Vérifiez votre connexion');
    expect(document.body.innerHTML).toContain('Rafraîchir la page');
  });

  it('should render HTTP 404 error without reload button', () => {
    renderBootError(new ConfigLoadError('http', 'HTTP error', HttpStatusCode.NotFound));

    expect(document.body.innerHTML).toContain('Erreur de chargement (HTTP 404)');
    expect(document.body.innerHTML).toContain('introuvable');
    expect(document.body.innerHTML).not.toContain('Rafraîchir la page');
  });

  it('should render generic HTTP error for non-404 status', () => {
    renderBootError(new ConfigLoadError('http', 'HTTP error', HttpStatusCode.InternalServerError));

    expect(document.body.innerHTML).toContain('Erreur de chargement (HTTP 500)');
    expect(document.body.innerHTML).toContain('erreur serveur');
  });

  it('should render invalid format error', () => {
    renderBootError(new ConfigLoadError('invalid_format', 'Invalid'));

    expect(document.body.innerHTML).toContain('Configuration invalide');
    expect(document.body.innerHTML).toContain('corrompu');
    expect(document.body.innerHTML).not.toContain('Rafraîchir la page');
  });

  it('should render missing fields error with field names', () => {
    renderBootError(
      new ConfigLoadError('missing_fields', 'Missing', undefined, ['apiUrl', 'version'])
    );

    expect(document.body.innerHTML).toContain('Configuration incomplète');
    expect(document.body.innerHTML).toContain('apiUrl, version');
  });

  it('should render missing fields error without field names', () => {
    renderBootError(new ConfigLoadError('missing_fields', 'Missing'));

    expect(document.body.innerHTML).toContain('Configuration incomplète');
    expect(document.body.innerHTML).toContain('paramètres obligatoires');
  });

  it('should render fallback error for unknown errors', () => {
    renderBootError(new Error('Something unexpected'));

    expect(document.body.innerHTML).toContain("n'a pas pu démarrer");
    expect(document.body.innerHTML).toContain('Rafraîchir la page');
  });

  it('should render fallback error for non-Error values', () => {
    renderBootError('string error');

    expect(document.body.innerHTML).toContain("n'a pas pu démarrer");
  });

  it('should render fallback error for null', () => {
    renderBootError(null);

    expect(document.body.innerHTML).toContain("n'a pas pu démarrer");
  });
});
