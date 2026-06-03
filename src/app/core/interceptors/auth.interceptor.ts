import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { AppConfigService } from '@core/services/app-config.service';
import { AuthService } from '@core/services/auth.service';

/**
 * Interceptor HTTP pour l'authentification Keycloak.
 *
 * Responsabilités :
 * 1. N'intercepte que les requêtes vers apiUrl.
 * 2. Ajoute automatiquement le bearer token si disponible.
 * 3. Tente un refresh silencieux du token avant l'appel via updateToken().
 * 4. En cas de 401 API, déclenche un re-login vers la page applicative courante.
 *
 * Important :
 * - On ne rejoue pas automatiquement la requête HTTP qui a échoué.
 * - Rejouer une requête non-idempotente (POST, PATCH, DELETE) peut provoquer
 *   des doublons ou des effets de bord.
 * - Après retour depuis Keycloak, l'application recharge la page courante
 *   et les composants relancent naturellement leurs appels de données.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const configService = inject(AppConfigService);
  const authService = inject(AuthService);
  const apiUrl = configService.get('apiUrl');

  if (!req.url.startsWith(apiUrl)) {
    return next(req);
  }

  return from(authService.getValidToken()).pipe(
    switchMap((token) => {
      const authReq = token
        ? req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          })
        : req;

      return next(authReq).pipe(
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized) {
            authService.login();
          }

          return throwError(() => error);
        }),
      );
    }),
  );
};
