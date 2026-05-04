# Contributing

Ce document décrit le workflow de contribution utilisé sur ce projet, de la création d'un work item GitLab jusqu'au merge de la Merge Request.

---

## Table des matières

- [Workflow en un coup d'œil](#workflow-en-un-coup-dœil)
- [1. Créer et s'assigner un work item](#1-créer-et-sassigner-un-work-item)
- [2. Créer la Merge Request (draft)](#2-créer-la-merge-request-draft)
- [3. Développer sur la branche](#3-développer-sur-la-branche)
- [4. Marquer la MR comme prête](#4-marquer-la-mr-comme-prête)
- [5. Revue et merge](#5-revue-et-merge)
- [Conventions de code](#conventions-de-code)
- [Structure des features](#structure-des-features)

---

## Workflow en un coup d'œil

```
Work item créé et assigné
        │
        ▼
Créer une MR depuis le work item  ──►  Branche créée automatiquement
        │                              (draft activé automatiquement)
        ▼
Développement local sur la branche
        │
        ▼
Push + pipeline vert
        │
        ▼
MR marquée "Ready for review"
        │
        ▼
Approbation(s) obtenue(s)
        │
        ▼
Merge
```

---

## 1. Créer et s'assigner un work item

1. Ouvrir le board GitLab du projet.
2. Créer un **work item** (Issue / Task) en décrivant clairement le besoin ou le bug.
3. **S'assigner** le work item avant de commencer à travailler dessus — cela signale à l'équipe que le sujet est pris en charge.

---

## 2. Créer la Merge Request (draft)

Depuis le work item GitLab, utiliser le bouton **"Create merge request"** :

- GitLab crée automatiquement une **branche nommée d'après le titre du work item** (ex: `42-fix-panier-total-calcul`).
- La MR est automatiquement placée en **Draft**, ce qui empêche un merge accidentel tant que le travail n'est pas terminé.
- La MR est liée au work item : le work item sera fermé automatiquement au merge.

> **Ne jamais créer la branche manuellement** — toujours passer par le work item pour garantir le nommage cohérent et le lien automatique MR ↔ work item.

Récupérer la branche en local :

```bash
git fetch origin
git checkout <nom-de-la-branche>
```

---

## 3. Développer sur la branche

### Commits

Utiliser le format [Conventional Commits](https://www.conventionalcommits.org/) :

```
<type>(<scope>): <description courte>

[corps optionnel]

[footer optionnel, ex: Closes #42]
```

**Types courants :**

| Type       | Usage                                       |
| ---------- | ------------------------------------------- |
| `feat`     | Nouvelle fonctionnalité                     |
| `fix`      | Correction de bug                           |
| `refactor` | Refactoring sans changement de comportement |
| `style`    | Formatage, renommage (pas de logique)       |
| `test`     | Ajout ou modification de tests              |
| `docs`     | Documentation uniquement                    |
| `chore`    | Tâches de maintenance (deps, config...)     |
| `perf`     | Amélioration de performance                 |

**Exemples :**

```bash
git commit -m "feat(orders): add panier confirmation page"
git commit -m "fix(users): correct email validation pattern"
git commit -m "refactor(core): migrate auth guard to functional guard"
```

### Hooks automatiques (Husky + lint-staged)

À chaque `git commit`, les hooks vérifient automatiquement les fichiers stagés :

- **`*.ts` / `*.html`** — Prettier + ESLint (zéro warning toléré)
- **`*.scss`** — Prettier + Stylelint (zéro warning toléré)

Un commit est **bloqué** si une règle n'est pas respectée. Corriger les erreurs signalées avant de relancer le commit.

---

## 4. Marquer la MR comme prête

Une fois le développement terminé et le pipeline vert :

1. Dans GitLab, cliquer sur **"Mark as ready"** sur la MR (retire le statut Draft).
2. Vérifier que la MR contient :
   - Une **description** claire de ce qui a été fait et pourquoi.
   - Un lien vers le work item (normalement déjà présent si la MR a été créée depuis le work item).
   - Des **screenshots ou enregistrements** si des changements UI sont impliqués.
3. Assigner un ou plusieurs **reviewers**.

---

## 5. Revue et merge

- Les reviewers analysent le code et laissent leurs commentaires dans GitLab.
- **Répondre à chaque thread** ouvert — ne jamais résoudre un thread sans avoir traité le commentaire.
- Une fois les approbations obtenues et tous les threads résolus, le merge peut être effectué.
- Préférer le mode **"Squash and merge"** pour garder un historique propre sur `main`, sauf si les commits intermédiaires ont une valeur documentaire.

---

## Conventions de code

- **Standalone components** obligatoires — pas de NgModule.
- **`inject()`** à la place du constructeur pour les injections de dépendances.
- **Signals** (`signal()`, `computed()`, `effect()`) pour la gestion d'état réactif.
- **Nouvelle control flow syntax** (`@if`, `@for`, `@switch`) — pas de `*ngIf` / `*ngFor`.
- **`input()` / `output()`** signal-based à la place des décorateurs `@Input()` / `@Output()`.
- Zéro `any` TypeScript sans justification explicite dans un commentaire.
- Chaque composant, service ou directive dispose de son propre fichier.

---

## Structure des features

Toute nouvelle feature doit respecter l'organisation suivante :

```
/features
  /ma-feature
    ma-feature.routes.ts          # Routes lazy-loadées, déclarées ici
    /pages
      /ma-page                    # Un dossier par page routée
        ma-page.ts
        /components               # Composants utilisés UNIQUEMENT par cette page
      /ma-sous-page               # Sous-route au même niveau (pas imbriquée dans /ma-page)
        ma-sous-page.ts
        /components
    /components                   # Composants partagés entre plusieurs pages de la feature
    /services                     # Services propres à la feature
    /models                       # Interfaces et types du domaine
```

### Règles clés

- **Les pages sœurs restent au même niveau** dans `/pages`. La hiérarchie parent/enfant est définie dans `ma-feature.routes.ts` via `children[]`, pas par l'imbrication des dossiers.
- Un composant va dans **`/pages/ma-page/components/`** s'il n'est utilisé que par cette page, dans **`/features/ma-feature/components/`** s'il est partagé entre plusieurs pages de la feature, et dans **`/shared/ui/`** s'il est réutilisable dans n'importe quelle feature.
- **`shared/ui/`** est réservé aux composants strictement présentationnels — aucun import de service métier n'est autorisé.

### Exemple de fichier de routes

```typescript
// orders.routes.ts
import { Routes } from '@angular/router';

export const ORDERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/panier/panier').then((m) => m.PanierPage),
    children: [
      {
        path: 'confirmation',
        loadComponent: () =>
          import('./pages/panier-confirmation/panier-confirmation').then(
            (m) => m.PanierConfirmationPage
          ),
      },
    ],
  },
];
```

Et dans `app.routes.ts` :

```typescript
export const APP_ROUTES: Routes = [
  {
    path: 'orders',
    loadChildren: () => import('./features/orders/orders.routes').then((m) => m.ORDERS_ROUTES),
  },
];
```
