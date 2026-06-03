import { APP_BASE_HREF, DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs';

import { AuthUser } from '@core/models/auth.model';

import Keycloak, { type KeycloakProfile } from 'keycloak-js';

import { AppConfigService } from './app-config.service';

const DEFAULT_MIN_TOKEN_VALIDITY = 30;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly config = inject(AppConfigService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly appBaseHref = inject(APP_BASE_HREF, { optional: true }) ?? '/';

  private keycloak?: Keycloak;
  private initPromise?: Promise<boolean>;
  private loginRedirectInProgress = false;

  private readonly _ready = signal(false);
  private readonly _authenticated = signal(false);
  private readonly _user = signal<AuthUser | null>(null);

  readonly ready = this._ready.asReadonly();
  readonly authenticated = this._authenticated.asReadonly();
  readonly user = this._user.asReadonly();

  readonly isLoggedIn = computed(() => this.ready() && this.authenticated());
  readonly displayName = computed(
    () => this.user()?.fullName ?? this.user()?.username ?? this.user()?.email ?? null,
  );

  /**
   * Initialise l'instance Keycloak une seule fois.
   * Aucun onLoad n'est utilisé : l'authentification est déclenchée explicitement
   * par le guard ou par l'interceptor en cas de session expirée.
   */
  async init(): Promise<boolean> {
    if (this.initPromise !== undefined) {
      return this.initPromise;
    }

    this.initPromise = this.initInternal();
    return this.initPromise;
  }

  /**
   * Redirige vers Keycloak puis revient exactement sur l'URL applicative demandée.
   * L'URL de retour tient compte du base href Angular pour rester compatible avec
   * un déploiement en sous-chemin (ex: /k8s-devlab/chatlab-frontend/).
   */
  async login(redirectPath = this.getCurrentAppPath()): Promise<void> {
    if (this.loginRedirectInProgress) {
      return;
    }

    this.loginRedirectInProgress = true;

    try {
      await this.init();
      await this.keycloak?.login({
        redirectUri: this.buildAbsoluteAppUrl(redirectPath),
      });
    } finally {
      this.loginRedirectInProgress = false;
    }
  }

  async logout(redirectPath = ''): Promise<void> {
    await this.init();
    await this.keycloak?.logout({
      redirectUri: this.buildAbsoluteAppUrl(redirectPath),
    });
  }

  /**
   * Retourne un token valide.
   * Si le token expire bientôt, Keycloak tente un refresh silencieux tant que
   * la session serveur est encore active.
   */
  async getValidToken(minValidity = DEFAULT_MIN_TOKEN_VALIDITY): Promise<string | null> {
    await this.init();

    if (!this.keycloak?.authenticated) return null;

    await this.keycloak.updateToken(minValidity);
    return this.keycloak.token ?? null;
  }

  hasRealmRole(role: string): boolean {
    return this.keycloak?.hasRealmRole(role) ?? false;
  }

  hasResourceRole(role: string, resource?: string): boolean {
    return this.keycloak?.hasResourceRole(role, resource) ?? false;
  }

  private async initInternal(): Promise<boolean> {
    const kc = this.config.get('keycloak');

    this.keycloak = new Keycloak({
      url: kc.url,
      realm: kc.realm,
      clientId: kc.clientId,
    });

    const authenticated = await this.keycloak.init({
      pkceMethod: kc.initOptions?.pkceMethod ?? 'S256',
      checkLoginIframe: kc.initOptions?.checkLoginIframe ?? false,
      responseMode: 'fragment',
    });

    this.scheduleAuthCallbackUrlCleanup();

    this._authenticated.set(authenticated);

    if (authenticated) {
      const profile = await this.keycloak.loadUserProfile();
      this._user.set(this.toUser(profile));
    }

    this._ready.set(true);
    return authenticated;
  }

  /**
   * Nettoie une seule fois les fragments OIDC laissés par Keycloak dans l'URL
   * (`#code`, `#state`, `#session_state`, `#iss`) après la première navigation
   * Angular qui suit le retour d'authentification.
   *
   * Pourquoi attendre NavigationEnd ?
   * Juste après `keycloak.init()`, le router n'a pas toujours terminé de stabiliser
   * l'URL courante. En se branchant sur le premier `NavigationEnd`, on s'assure
   * d'intervenir au bon moment, sans multiplier les `setTimeout` ou les retries.
   */
  private scheduleAuthCallbackUrlCleanup(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        take(1),
      )
      .subscribe(() => this.cleanAuthCallbackUrl());
  }

  /**
   * Supprime les fragments OIDC ajoutés par Keycloak après le retour d'authentification
   * pour conserver une URL propre dans la barre d'adresse.
   */
  private cleanAuthCallbackUrl(): void {
    const hash = this.document.location.hash;

    const looksLikeKeycloakCallback =
      hash.includes('code=') ||
      hash.includes('state=') ||
      hash.includes('session_state=') ||
      hash.includes('iss=');

    if (!looksLikeKeycloakCallback) {
      return;
    }

    globalThis.window.history.replaceState(
      null,
      this.document.title,
      `${this.document.location.pathname}${this.document.location.search}`,
    );
  }

  /**
   * Retourne le chemin applicatif courant sans le préfixe du base href.
   * Exemple :
   * - URL réelle   : /k8s-devlab/chatlab-frontend/landing-page?x=1
   * - base href    : /k8s-devlab/chatlab-frontend/
   * - résultat     : /landing-page?x=1
   */
  private getCurrentAppPath(): string {
    const pathname = this.document.location.pathname;
    const search = this.document.location.search;
    const basePath = this.normalizeBaseHref(this.appBaseHref);

    if (pathname.startsWith(basePath)) {
      const stripped = pathname.slice(basePath.length);
      return `/${stripped}${search}`.replace(/\/{2,}/g, '/');
    }

    return `${pathname}${search}`;
  }

  /**
   * Construit une URL absolue de retour vers l'application, compatible avec un
   * déploiement sous sous-chemin.
   *
   * Exemple :
   * - origin       : https://devlab-ap.one.ad
   * - base href    : /k8s-devlab/chatlab-frontend/
   * - redirectPath : /landing-page
   * - résultat     : https://devlab-ap.one.ad/k8s-devlab/chatlab-frontend/landing-page
   */
  private buildAbsoluteAppUrl(redirectPath = ''): string {
    const origin = this.document.location.origin;
    const basePath = this.normalizeBaseHref(this.appBaseHref);
    const normalizedRedirectPath = redirectPath.startsWith('/')
      ? redirectPath.slice(1)
      : redirectPath;

    return new URL(`${basePath}${normalizedRedirectPath}`, origin).toString();
  }

  /**
   * Normalise le APP_BASE_HREF pour toujours obtenir un format /prefix/.
   */
  private normalizeBaseHref(baseHref: string): string {
    const withLeadingSlash = baseHref.startsWith('/') ? baseHref : `/${baseHref}`;
    return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
  }

  private toUser(profile: KeycloakProfile): AuthUser {
    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();

    return {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      fullName: fullName || undefined,
    };
  }
}
