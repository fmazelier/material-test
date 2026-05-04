# anos-frontend

Application Angular **21** configurée avec Angular Material, Tailwind CSS 4, et une chaîne qualité complète (ESLint, Stylelint, Prettier, Husky, lint-staged).

> **Moteur requis :** Node ≥ 24 · npm ≥ 11

---

## Table des matières

- [Prérequis](#prérequis)
- [Installation](#installation)
- [Architecture du projet](#architecture-du-projet)
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

    /layout                         # Header, sidebar (shell de l'app)
      /header
      /sidebar

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
  "js/ts.updateImportsOnFileMove.enabled": "always"
}
```
