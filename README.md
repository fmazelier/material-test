# anos-frontend

Application Angular **21** configurée avec Angular Material, Tailwind CSS 4, et une chaîne qualité complète (ESLint, Stylelint, Prettier, Husky, lint-staged).

> **Moteur requis :** Node ≥ 24 · npm ≥ 11

---

## Table des matières

- [Prérequis](#prérequis)
- [Installation](#installation)
- [Architecture du projet](#architecture-du-projet)
- [Configuration applicative](#configuration-applicative)
- [Gestion des erreurs HTTP](#gestion-des-erreurs-http)
- [Styles & Icônes](#styles&icônes)
- [Scripts disponibles](#scripts-disponibles)
- [Qualité du code](#qualité-du-code)
- [Hooks Git (Husky + lint-staged)](#hooks-git-husky--lint-staged)
- [Versionning & Release](#versionning--release)
- [Génération de snippets Tailwind/Material](#génération-de-snippets-tailwindmaterial)
- [Recommandations VS Code](#recommandations-vs-code)

---

## Prérequis

| Outil       | Version minimale                |
| ----------- | ------------------------------- |
| Node.js     | `>= 24`                         |
| npm         | `>= 11`                         |
| Angular CLI | `^21.2.8` (installé localement) |

---

## Installation

```bash
# Cloner le repo
git clone https://gitlab.sofa.snm.snecma/lso/anos-frontend.git
cd anos-frontend

# Installer les dépendances (installe aussi les hooks Husky via le script "prepare")
npm install
```

> Le script `prepare` est exécuté automatiquement par npm après chaque `install`, ce qui initialise les hooks Husky.

---

## Architecture du projet

```
/public
  config.json                       # Configuration runtime (hors bundle)
  favicon.ico
  /lottie-animations                # Animations Lottie (JSON)
    pdf.json

/scripts                            # Scripts utilitaires Node.js
  generate-mat-tailwind-snippets.mjs

/src
  /app
    /core                           # Singletons, guards, interceptors, config
      /services
      /interceptors
      /guards
      /config
      /layout                         # Header, sidebar (shell de l'app)
        /footer
        /sidebar

    /features                       # Domaines métier (lazy-loadés)
      /ma-feature
        ma-feature.routes.ts
        /pages
          /ma-page                  # Un dossier par page routée
            ma-page.ts
            /components             # Composants utilisés UNIQUEMENT par cette page
          /ma-sous-page             # Sous-route au même niveau (pas imbriquée dans /ma-page)
            ma-sous-page.ts
            /components
        /components                 # Composants partagés entre plusieurs pages de la feature
        /services                   # Services propres à la feature
        /models                     # Types de la feature

    /shared                         # Composants, directives, pipes SANS logique métier
      /components                   # Composants UI purement présentationnels
      /directives
      /pipes
      /utils
      /models

  /styles                           # Styles globaux
    /global                         # Animations, reset custom
    /theme                          # Thème Angular Material + Tailwind CSS 4

  /types                            # Déclarations TypeScript globales
    lottie-web-svg.d.ts
```

### Principes d'organisation

- **`core/`** — services instanciés une seule fois (`providedIn: 'root'`), interceptors, guards et layout applicatif.
- **`shared/components/`** — composants **strictement présentationnels** : aucun import de service métier n'est autorisé ici.
- **`features/`** — chaque feature est lazy-loadée via son propre `*.routes.ts`. La hiérarchie des dossiers dans `/pages` reste **plate** ; c'est le fichier de routes qui définit l'imbrication parent/enfant via `children[]`, pas la structure de dossiers.

---


## Configuration applicative

La configuration de l'application est chargée **au démarrage**, avant le rendu de la moindre route, via `provideAppInitializer()`. Si la configuration est invalide ou inaccessible, l'application **ne démarre pas** — ce qui garantit qu'aucun composant ne s'exécute avec une config manquante.

### Chargement bloquant au bootstrap

```typescript
// app.config.ts
provideAppInitializer(() => {
  const configService = inject(ConfigService);
  return configService.loadConfig(); // Promise — Angular attend la résolution avant de bootstrapper
}),
```

`provideAppInitializer()` est la syntaxe moderne (Angular 19+) remplaçant `APP_INITIALIZER`. Angular attend la résolution de la Promise retournée avant d'initialiser le router et d'afficher quoi que ce soit.

### Source de configuration

La configuration est lue depuis un fichier **`config.json` servi statiquement** (non bundlé), ce qui permet de modifier les paramètres de déploiement (URL d'API, version, date de déploiement) **sans recompiler l'application**.

```
public/
  config.json        ← lu au runtime via fetch(), non inclus dans le bundle
```

Exemple de `config.json` :

```json
{
  "apiUrl": "https://api.example.com",
  "version": "1.4.2",
  "deployedAt": "2026-05-06T14:30:00Z"
}
```

### Validation stricte à l'entrée

Avant d'être assignée, il y a quatre niveaux de contrôle dans l'ordre suivant :

| Contrôle                          | Erreur levée                                                       |
| --------------------------------- | ------------------------------------------------------------------ |
| Échec réseau (`fetch` throws)     | `[Config] Network error while loading config.json`                 |
| Réponse HTTP non-OK               | `[Config] Failed to load config.json (HTTP 404)`                   |
| Format JSON non respecté          | `[Config] config.json is not a valid JSON object`                  |
| Champs requis manquants ou `null` | `[Config] Missing required fields in config.json: apiUrl, version` |

Les champs requis sont déclarés dans `REQUIRED_KEYS : (keyof AppConfig)[]` — étendre la liste suffit à rendre un nouveau champ obligatoire sans modifier la logique de validation.

### Accès à la configuration dans les services

Une fois chargée, la config est accessible en injection directe via `ConfigService` :

```typescript
// Dans n'importe quel service
private readonly config = inject(ConfigService);

// Accès typé par clé générique
const url = this.config.get('apiUrl');    // string

// Raccourci pour les clés fréquentes
const url = this.config.apiUrl;           // string
```

> L'assertion non-null (`config!: AppConfig`) est intentionnelle : la config étant garantie présente après le bootstrap, le contrôle de nullité à chaque accès serait du bruit inutile.

### Banner de démarrage

Au bootstrap, un banner est affiché dans la console avec le nom de l'app (lu depuis `package.json`), sa version et sa date de déploiement formatée en heure de Paris :

```
 my-app  v1.4.2  deployed on 06 May 2026 at 16:30
```

En l'absence de `deployedAt` (environnement local), le label affiche `local server` à la place.

---

## Gestion des erreurs HTTP

L'application centralise la gestion des erreurs HTTP via une architecture en deux couches : un intercepteur fonctionnel global et un mécanisme d'opt-out granulaire par requête.

### Architecture

```
Requête HTTP
     │
     ▼
HttpErrorInterceptor          ← couche globale
     │
     ├─ SKIP_GLOBAL_ERROR_HANDLER = true  →  délégation au service appelant
     ├─ IGNORED_ERROR_STATUSES = [x, y]   →  codes ignorés, reste géré globalement
     │
     ▼
SnackbarService.error()       ← affichage utilisateur
     │
     ▼
throwError(() => error)       ← l'erreur reste propagée pour les appelants
```

### Intercepteur global (`http-error.interceptor.ts`)

Toutes les requêtes HTTP passent par `httpErrorInterceptor`, enregistré dans `app.config.ts` via `withInterceptors([httpErrorInterceptor])`.

L'intercepteur :

- affiche un message utilisateur adapté au code HTTP (`HttpStatusCode` natif Angular)
- distingue les erreurs réseau (`status === 0`) des erreurs serveur
- **repropage toujours l'erreur** (`throwError(() => error)`) pour ne pas bloquer les appelants

### Opt-out par requête (`HttpContext`)

Deux tokens `HttpContextToken` permettent de désactiver ou de filtrer le comportement global sur une requête spécifique :

| Token                       | Type                         | Comportement                                                        |
| --------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| `SKIP_GLOBAL_ERROR_HANDLER` | `boolean` (défaut : `false`) | Désactive entièrement l'intercepteur pour cette requête             |
| `IGNORED_ERROR_STATUSES`    | `number[]` (défaut : `[]`)   | Ignore certains codes HTTP — le reste est toujours géré globalement |

**Exemple — message d'erreur entièrement personnalisé :**

```typescript
this.http
  .post('/api/upload', formData, {
    context: new HttpContext().set(SKIP_GLOBAL_ERROR_HANDLER, true),
  })
  .pipe(
    catchError((err) => {
      this.snackbarService.error('Message personnalisé pour cet appel.');
      return throwError(() => err);
    })
  );
```

**Exemple — certains codes gérés localement, le reste globalement :**

```typescript
this.http
  .get('/api/resource', {
    context: new HttpContext().set(IGNORED_ERROR_STATUSES, [HttpStatusCode.NotFound]),
  })
  .pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === HttpStatusCode.NotFound) {
        // gestion locale du 404
      }
      return throwError(() => err);
    })
  );
```

---

## Styles & Icônes

_TODO : ajouter une section sur la configuration Tailwind CSS 4 et le thème Angular Material custom._

### Organisation des styles

Les styles du projet sont répartis dans `src/styles/` :

```
/styles
  /fonts       # Gestion des différents polices
  /global      # Reset custom, animations globales
  /theme       # Thème Angular Material + tokens Tailwind CSS 4
styles.css   # Point d'entrée principal
```

Les styles **globaux** (reset, fixes de compatibilité, styles partagés entre composants) vont dans `src/styles/global/`. Les styles **propres à un composant** restent dans le fichier `.scss` du composant lui-même avec l'encapsulation par défaut (`Emulated`), sauf cas justifié.

### Bibliothèque d'icônes — Lucide

Le projet utilise [`@lucide/angular`](https://lucide.dev/guide/angular/getting-started) à la place des icônes Angular Material. Ce choix repose sur plusieurs raisons :

- **Tree-shaking natif** : seules les icônes explicitement importées sont incluses dans le bundle final, contrairement à la font Material Icons qui charge l'intégralité du catalogue.
- **Design system cohérent** : +1 400 icônes avec un stroke uniforme et une grille pixel-perfect.
- **Stack-compatible** : composants standalone, zoneless-friendly, signals-ready.

#### Composant wrapper `IconComponent`

Pour garantir une compatibilité maximale avec Angular Material (boutons, ripple, layout), Lucide n'est **pas utilisé directement** mais via un composant wrapper qui s'intègre nativement dans l'écosystème Material.

> **Pourquoi `mat-icon[appIcon]` comme sélecteur ?**
> En utilisant `mat-icon` comme élément hôte avec une directive attribut, le composant est reconnu nativement par Angular Material pour l'alignement dans les boutons, le calcul du ripple et les APIs `iconPositionEnd` / `iconPositionStart`. Utiliser un sélecteur générique `mat-icon` seul remplacerait le composant `MatIcon` de Material dans toute l'application — à éviter absolument.

> **Pourquoi `ViewEncapsulation.None` ?**
> Le template contient un `<svg>` raw. Avec l'encapsulation par défaut (`Emulated`), Angular ajouterait un attribut `_ngcontent-xxx` sur le SVG, ce qui empêcherait les styles globaux de le cibler. `ViewEncapsulation.None` est ici intentionnel.

#### Styles globaux associés

Les styles du wrapper sont centralisés dans `src/styles/global/_icons.scss` (et non dans le composant, pour éviter l'injection répétée dans le DOM) :

#### Utilisation

Importer les icônes nécessaires depuis `@lucide/angular` dans chaque composant qui les utilise — c'est la contrepartie du tree-shaking :

```typescript
import { IconComponent } from '@shared/components/icon/icon.component';

import { LucideFileText, LucideHouse, LucideMenu } from '@lucide/angular';

@Component({
  imports: [IconComponent],
  // ...
})
export class MyComponent {
  protected readonly icons = {
    menu: LucideMenu,
    home: LucideHouse,
    file: LucideFileText,
  };
}
```

```html
<!-- Taille gérée par le contexte Material (18px dans un bouton, 24px ailleurs) -->
<button matButton="outlined">
  <mat-icon appIcon [icon]="icons.file" />
  Parcourir
</button>

<!-- Icon button -->
<button matIconButton aria-label="Ouvrir le menu">
  <mat-icon appIcon [icon]="icons.menu" />
</button>

<!-- Taille explicite si besoin -->
<mat-icon appIcon [icon]="icons.home" [size]="32" />
```

---

## Scripts disponibles

### Développement

| Commande        | Description                                       |
| --------------- | ------------------------------------------------- |
| `npm start`     | Lance le serveur de développement (`ng serve`)    |
| `npm run watch` | Build en mode watch (configuration `development`) |

### Build

| Commande        | Description         |
| --------------- | ------------------- |
| `npm run build` | Build de production |

### Tests

| Commande   | Description                                      |
| ---------- | ------------------------------------------------ |
| `npm test` | Lance les tests unitaires via Vitest (`ng test`) |

### Qualité & formatage

| Commande                  | Description                                                         |
| ------------------------- | ------------------------------------------------------------------- |
| `npm run lint`            | Lint TypeScript/HTML via ESLint (`ng lint`)                         |
| `npm run lint:styles`     | Lint des fichiers CSS/SCSS via Stylelint                            |
| `npm run lint:styles:fix` | Lint SCSS avec correction automatique                               |
| `npm run format`          | Formate tous les fichiers `ts`, `html`, `scss`, `json` via Prettier |
| `npm run format:check`    | Vérifie le formatage sans modifier les fichiers (utile en CI)       |

### Scripts utilitaires

| Commande                                 | Description                                                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `npm run generate:mat-tailwind-snippets` | Génère des snippets VS Code combinant les classes Angular Material et Tailwind CSS (`scripts/generate-mat-tailwind-snippets.mjs`) |

---

## Qualité du code

### ESLint

Configuration via `angular-eslint` + `typescript-eslint`. Règles Prettier intégrées via `eslint-config-prettier` pour éviter les conflits. Zéro warning toléré en pré-commit.

### Stylelint

Configuration basée sur `stylelint-config-standard-scss`. Couvre tous les fichiers `*.css` et `*.scss` du dossier `src/`.

### Prettier

Formatage unifié de `ts`, `html`, `scss` et `json`. Le plugin `@trivago/prettier-plugin-sort-imports` trie automatiquement les imports TypeScript.

---

## Hooks Git (Husky + lint-staged)

Les hooks sont installés automatiquement lors du `npm install` via le script `prepare`.

### Comportement au `pre-commit`

lint-staged analyse **uniquement les fichiers stagés** et applique les vérifications suivantes :

| Fichiers        | Actions                                                    |
| --------------- | ---------------------------------------------------------- |
| `src/**/*.ts`   | `prettier --write` puis `eslint --fix --max-warnings 0`    |
| `src/**/*.html` | `prettier --write` puis `eslint --fix --max-warnings 0`    |
| `src/**/*.scss` | `prettier --write` puis `stylelint --fix --max-warnings 0` |

> Un commit est **bloqué** si ESLint ou Stylelint remonte le moindre warning après correction automatique.

---

## Versionning & Release

TODO

---

## Génération de snippets Tailwind/Material

```bash
npm run generate:mat-tailwind-snippets
```

Le script `scripts/generate-mat-tailwind-snippets.mjs` introspect les tokens Tailwind CSS 4 configurés dans le projet et génère des snippets VS Code (`*.code-snippets`) permettant d'autocompléter les combinaisons de classes Material + utilitaires Tailwind. Les fichiers générés sont placés dans `.vscode/`.

---

## Recommandations VS Code

Les extensions et réglages ci-dessous sont fortement recommandés pour une expérience de développement optimale sur ce projet.

### Extensions recommandées

Créer un fichier `.vscode/extensions.json` à la racine avec :

```json
{
  "recommendations": [
    "angular.ng-template",
    "dbaeumer.vscode-eslint",
    "stylelint.vscode-stylelint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "usernamehw.errorlens"
  ]
}
```

### Settings utilisateur recommandés (`settings.json`)

Ajouter ces entrées dans votre `settings.json` **utilisateur** (ctrl+Shift+P → _Open User Settings JSON_) :

```json
{
  "telemetry.telemetryLevel": "off",
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.fixAll.stylelint": "explicit",
    "source.organizeImports": "explicit",
    "source.addMissingImports": "explicit"
  },
  "css.validate": false,
  "scss.validate": false,
  "stylelint.validate": ["css", "scss"],
  "eslint.validate": ["typescript", "javascript", "html"],
  "cssVariables.lookupFiles": ["**/*.css", "**/*.scss", "**/*.sass", "**/*.less"],
  "editor.snippetSuggestions": "top",
  "js/ts.tsserver.experimental.enableProjectDiagnostics": false,
  "editor.bracketPairColorization.enabled": true,
  "files.eol": "\n",
  "js/ts.updateImportsOnFileMove.enabled": "always",
    "tailwindCSS.experimental.configFile": "src/styles/theme/tailwind.css"
}
```
