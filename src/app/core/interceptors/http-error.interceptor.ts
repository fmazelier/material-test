import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { SnackbarService } from '@shared/services/snackbar.service';

import {
  IGNORED_ERROR_STATUSES,
  SKIP_GLOBAL_ERROR_HANDLER,
} from '../tokens/http-error-context.token';

const HTTP_ERROR_MESSAGES: Partial<Record<HttpStatusCode, string>> = {
  [HttpStatusCode.BadRequest]: "La demande n'a pas pu être comprise par le serveur.",
  [HttpStatusCode.Unauthorized]: 'Vous devez être connecté pour accéder à cette ressource.',
  [HttpStatusCode.Forbidden]: "Vous n'avez pas l'autorisation d'accéder à cette ressource.",
  [HttpStatusCode.NotFound]: "Nous n'avons pas pu trouver la ressource demandée.",
  [HttpStatusCode.PayloadTooLarge]: 'La demande est trop volumineuse pour être traitée.',
  [HttpStatusCode.InternalServerError]:
    'Une erreur interne est survenue. Veuillez réessayer plus tard.',
  [HttpStatusCode.ServiceUnavailable]: 'Le service est temporairement indisponible.',
};

const DEFAULT_ERROR_MESSAGE = "Une erreur inattendue s'est produite.";
const NETWORK_ERROR_MESSAGE = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackbarService = inject(SnackbarService);

  // skip global error handling if the context token is set
  if (req.context.get(SKIP_GLOBAL_ERROR_HANDLER)) return next(req);

  const ignoredStatuses = req.context.get(IGNORED_ERROR_STATUSES);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // skip error handling if the error status is in the ignored list
      if (ignoredStatuses.includes(error.status)) return throwError(() => error);

      const message =
        error.status === 0
          ? NETWORK_ERROR_MESSAGE
          : (HTTP_ERROR_MESSAGES[error.status as HttpStatusCode] ?? DEFAULT_ERROR_MESSAGE);

      snackbarService.error(message);

      return throwError(() => error);
    })
  );
};
