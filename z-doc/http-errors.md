Voilà une réponse complète sur l'architecture la plus saine à adopter en 2025/2026 sur Angular moderne.

***

## Architecture globale recommandée

L'approche **intercepteur fonctionnel + `HttpContext` token** est la best practice actuelle sur Angular moderne. Elle te donne la gestion centralisée que tu veux, tout en offrant une **soupape d'échappement granulaire** par requête sans avoir à dupliquer de la logique dans chaque service.[1][2]

***

## 1. Supprimer ton `HttpStatusCode` custom

Angular expose nativement `HttpStatusCode` depuis `@angular/common/http` — inutile de recréer le tien  :[3][4]

```typescript
import { HttpStatusCode } from '@angular/common/http';

// Utilisation
if (error.status === HttpStatusCode.Unauthorized) { ... }
```

> ⚠️ Note : certains préfèrent un `const` object plutôt que l'enum Angular pour le tree-shaking — les deux sont valides.[5]

***

## 2. Le `HttpContext` token : ta soupape d'échappement

C'est **la réponse à ta peur de perdre en flexibilité**. Disponible depuis Angular 12, `HttpContextToken` te permet de passer des métadonnées à un intercepteur depuis n'importe quelle requête.[6][7]

```typescript
// http-error-context.token.ts
import { HttpContextToken } from '@angular/common/http';

export const SKIP_GLOBAL_ERROR_HANDLER = new HttpContextToken<boolean>(() => false);

// Variante avancée : ignorer seulement certains codes HTTP
export const IGNORED_ERROR_STATUSES = new HttpContextToken<number[]>(() => []);
```

Usage dans un service quand tu veux **gérer l'erreur manuellement** :

```typescript
// Dans PdfMaskingService — on skip pour gérer un message personnalisé
uploadPdf(file: File): Observable<UploadPdfResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return this.http.post<UploadPdfResponse>(
    `${this.config.apiUrl}/anos/upload`,
    formData,
    {
      context: new HttpContext().set(SKIP_GLOBAL_ERROR_HANDLER, true),
    }
  ).pipe(
    catchError((err) => {
      this.snackbarService.error('Une erreur est survenue lors de l\'envoi du PDF.');
      return throwError(() => err);
    })
  );
}
```

***

## 3. L'intercepteur fonctionnel final

Avec la syntaxe fonctionnelle (`HttpInterceptorFn`), standalone et `inject()`  :[8]

```typescript
// http-error.interceptor.ts
import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { SKIP_GLOBAL_ERROR_HANDLER, IGNORED_ERROR_STATUSES } from './http-error-context.token';
import { SnackbarService } from './snackbar.service';

const HTTP_ERROR_MESSAGES: Partial<Record<HttpStatusCode, string>> = {
  [HttpStatusCode.BadRequest]: 'La demande n\'a pas pu être comprise par le serveur.',
  [HttpStatusCode.Unauthorized]: 'Vous devez être connecté pour accéder à cette ressource.',
  [HttpStatusCode.Forbidden]: 'Vous n\'avez pas l\'autorisation d\'accéder à cette ressource.',
  [HttpStatusCode.NotFound]: 'Nous n\'avons pas pu trouver la ressource demandée.',
  [HttpStatusCode.PayloadTooLarge]: 'La demande est trop volumineuse pour être traitée.',
  [HttpStatusCode.InternalServerError]: 'Une erreur interne est survenue. Veuillez réessayer plus tard.',
  [HttpStatusCode.ServiceUnavailable]: 'Le service est temporairement indisponible.',
};

const DEFAULT_ERROR_MESSAGE = 'Une erreur inattendue s\'est produite.';
const NETWORK_ERROR_MESSAGE = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackbarService = inject(SnackbarService);

  // Skip si demandé explicitement par la requête
  if (req.context.get(SKIP_GLOBAL_ERROR_HANDLER)) {
    return next(req);
  }

  const ignoredStatuses = req.context.get(IGNORED_ERROR_STATUSES);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Skip pour les codes HTTP ignorés sur cette requête
      if (ignoredStatuses.includes(error.status)) {
        return throwError(() => error);
      }

      const message = error.status === 0
        ? NETWORK_ERROR_MESSAGE
        : (HTTP_ERROR_MESSAGES[error.status as HttpStatusCode] ?? DEFAULT_ERROR_MESSAGE);

      snackbarService.error(message);

      return throwError(() => error);
    })
  );
};
```

***

## 4. Enregistrement dans `app.config.ts`

Syntaxe moderne standalone, sans module  :[9]

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([httpErrorInterceptor])
    ),
  ],
};
```

***

## 5. Simplification de `PdfMaskingService`

Avec l'intercepteur en place, le service ne gère que les cas **vraiment spécifiques**. Pour les cas standards, plus besoin de `catchError` dans le service  :[1]

```typescript
@Injectable({ providedIn: 'root' })
export class PdfMaskingService implements PdfMaskingServiceAbstract {
  private readonly config = inject(ConfigService);
  private readonly http = inject(HttpClient);

  // ✅ Erreur générique gérée globalement — rien à faire ici
  uploadTextFile(file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<unknown>(`${this.config.apiUrl}/anos/upload-variants`, formData);
  }

  // ✅ Message personnalisé → on skip l'intercepteur
  uploadPdf(file: File): Observable<UploadPdfResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadPdfResponse>(
      `${this.config.apiUrl}/anos/upload`,
      formData,
      { context: new HttpContext().set(SKIP_GLOBAL_ERROR_HANDLER, true) }
    ).pipe(
      catchError((err) => {
        this.snackbarService.error('Une erreur est survenue lors de l\'envoi du PDF.');
        return throwError(() => err);
      })
    );
  }

  // ✅ Codes spécifiques ignorés → variante granulaire
  downloadProcessedPdf(fileName: string): Observable<Blob> {
    return this.http.get(
      `${this.config.apiUrl}/anos/download/${fileName}`,
      {
        responseType: 'blob',
        // Exemple : on gère le 404 localement, le reste part à l'intercepteur
        context: new HttpContext().set(IGNORED_ERROR_STATUSES, [HttpStatusCode.NotFound]),
      }
    ).pipe(
      tap((blob) => this.triggerDownload(blob, fileName)),
      catchError((err: HttpErrorResponse) => {
        if (err.status === HttpStatusCode.NotFound) {
          this.snackbarService.error('Le PDF masqué est introuvable.');
        }
        return throwError(() => err);
      })
    );
  }
}
```

***

## Récapitulatif des patterns disponibles

| Cas | Approche |
|---|---|
| Erreur générique → toast standard | Ne rien faire, l'intercepteur s'en charge |
| Message personnalisé complet | `SKIP_GLOBAL_ERROR_HANDLER: true` + `catchError` local |
| Gérer certains codes, pas d'autres | `IGNORED_ERROR_STATUSES: [404, 409]` + `catchError` local |
| Retry automatique (ex: 503) | Ajouter `retry({ count: 2 })` dans l'intercepteur |
| Redirect sur 401 | Injecter `Router` dans l'intercepteur + `router.navigate(['/login'])` |

***

## Points clés à retenir

- **Ne recrée pas `HttpStatusCode`** : Angular le fournit nativement depuis `@angular/common/http`.[3]
- **`HttpContextToken` est la solution officielle** pour désactiver/personnaliser un intercepteur par requête, et elle est compatible avec `httpResource` (Angular 19+).[2]
- **L'intercepteur fonctionnel** (`HttpInterceptorFn`) avec `inject()` est le standard actuel — la classe `HttpInterceptor` est dépréciée dans les architectures standalone.[9]
- **Le service garde sa responsabilité** : il ne connaît que les erreurs métier qui lui sont propres, l'infrastruture HTTP reste dans la couche infra.[1]

Sources
[1] Global error handling with Angular Interceptors https://www.reddit.com/r/angular/comments/1qq8qa1/global_error_handling_with_angular_interceptors/
[2] Angular HTTP Context — Feature You Didn’t Know About but Always Needed https://www.youtube.com/watch?v=3JCB_ddZ-Ww
[3] HttpStatusCode https://runebook.dev/en/docs/angular/api/common/http/httpstatuscode
[4] HttpStatusCode https://angular.dev/api/common/http/HttpStatusCode
[5] The forgotten Enum in the #Angular ecosystem | Roberto ... https://www.linkedin.com/posts/roberto-heckers-2313453b_angular-activity-7341063575190269953-EnEG
[6] Bypass Angular Interceptors with request metadata https://itnext.io/bypass-angular-interceptors-with-request-metadata-cf28061cda69?gi=4e939354930b
[7] HttpContext - Angular https://angular.dev/api/common/http/HttpContext
[8] Error Handling with Angular Interceptors https://dev.to/cezar-plescan/error-handling-with-angular-interceptors-2548
[9] Angular Interceptors — Auth & Global HTTP Error Handling (Basics, 2025) https://www.youtube.com/watch?v=BNM5203kxgs
[10] Advanced Angular Error Handling: Best Practices, ... https://dev.to/codewithrajat/advanced-angular-error-handling-best-practices-architecture-tips-code-examples-3939
[11] Intercepting requests and responses https://angular.dev/guide/http/interceptors
[12] HTTP interceptors in Angular (2025 update) https://blog.angulartraining.com/http-interceptors-in-angular-61dcf80b6bdd
[13] Global error handling in angular using interceptor | Free Angular Tutorial https://www.youtube.com/watch?v=dp08jPXg4g0
[14] How to make an angular module to ignore http interceptor ... https://stackoverflow.com/questions/46469349/how-to-make-an-angular-module-to-ignore-http-interceptor-added-in-a-core-module
[15] Interceptors in Angular #3 - Handling HTTP Responses and Errors Globally https://www.youtube.com/watch?v=UhJTxqDnRoU
[16] Interceptors and Error Handling | CodeSignal Learn https://codesignal.com/learn/courses/angular-features-and-data-management/lessons/interceptors-and-error-handling
[17] Unhandled errors in Angular https://angular.dev/best-practices/error-handling
[18] Day 10: Angular Interceptors: Global HTTP Request and ... https://www.linkedin.com/pulse/day-10-angular-interceptors-global-http-request-response-sukesh-marla-umicf
[19] Implementing global error handling in Angular? https://www.facebook.com/groups/AngularPH/posts/24494558776796388/
[20] How to implement a global ErrorHandler along with an HttpInterceptor in Angular? https://stackoverflow.com/questions/74948876/how-to-implement-a-global-errorhandler-along-with-an-httpinterceptor-in-angular
[21] Angular 21 Global Error Handling with HTTP Interceptor (Step-by-Step Guide) https://www.youtube.com/watch?v=FXOE3XtIsSc
[22] Bypass Angular interceptors using HttpContext factory + ... https://bradleycarey.com/posts/bypass-angular-interceptor/
[23] How to make an angular module to ignore http interceptor added in a core module https://stackoverflow.com/questions/46469349/how-to-make-an-angular-module-to-ignore-http-interceptor-added-in-a-core-module/75454059
[24] Skip an Angular HTTP interceptor? https://github.com/quan1997ap/angular-app-note/wiki/Skip-an-Angular-HTTP-interceptor%3F
[25] Angular 2: Http Response Status Codes as constants https://stackoverflow.com/questions/45051382/angular-2-http-response-status-codes-as-constants/49270581
[26] Omitir un Interceptor de Angular usando Context para Http Interceptors https://dev.to/ricardochl/omitir-un-interceptor-de-angular-usando-context-para-http-interceptors-cf0
[27] status-code-enum https://www.npmjs.com/package/status-code-enum
[28] What the heck is HttpContext in Angular? https://dev.to/angular/what-the-heck-is-httpcontext-in-angular-4n3c
