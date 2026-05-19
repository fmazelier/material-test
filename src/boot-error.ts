import { HttpStatusCode } from '@angular/common/http';

import { ConfigLoadError } from './app/core/models/config-error.model';

type BootErrorContent = {
  title: string;
  detail: string;
  showReload: boolean;
};

function getErrorContent(err: unknown): BootErrorContent {
  if (err instanceof ConfigLoadError) {
    switch (err.code) {
      case 'network':
        return {
          title: 'Connexion impossible',
          detail:
            'Impossible de joindre le serveur. Vérifiez votre connexion internet et réessayez.',
          showReload: true,
        };
      case 'http':
        return {
          title: `Erreur de chargement (HTTP ${err.httpStatus})`,
          detail:
            err.httpStatus === HttpStatusCode.NotFound
              ? 'Le fichier de configuration est introuvable. Vérifiez le déploiement.'
              : 'Une erreur serveur est survenue lors du chargement de la configuration.',
          showReload: false,
        };
      case 'invalid_format':
        return {
          title: 'Configuration invalide',
          detail: 'Le fichier de configuration est corrompu ou dans un format inattendu.',
          showReload: false,
        };
      case 'missing_fields': {
        const missingFieldsDetail = err.missingFields?.length
          ? ` : ${err.missingFields.join(', ')}`
          : '';
        const detail = `Des paramètres obligatoires sont manquants${missingFieldsDetail}.`;

        return {
          title: 'Configuration incomplète',
          detail,
          showReload: false,
        };
      }
    }
  }

  return {
    title: "L'application n'a pas pu démarrer",
    detail: 'Une erreur inattendue est survenue. Veuillez réessayer ou contacter le support.',
    showReload: true,
  };
}

export function renderBootError(err: unknown): void {
  const { title, detail, showReload } = getErrorContent(err);

  document.body.innerHTML = `
    <div class="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center bg-surface text-on-surface">
      <svg class="text-error" width="48" height="48" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
           aria-hidden="true">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
      </svg>

      <h1 class="m-0 text-xl font-bold">${title}</h1>

      <p class="m-0 max-w-sm text-sm text-on-surface/70">${detail}</p>

      ${
        showReload
          ? `<button
               onclick="location.reload()"
               class="mt-2 cursor-pointer rounded-lg border-none bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
             >
               Rafraîchir la page
             </button>`
          : ''
      }
    </div>
  `;
}
