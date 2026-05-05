import { Routes } from '@angular/router';

import { ShellComponent } from '@core/layout/shell/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        redirectTo: 'landing-page',
        pathMatch: 'full',
      },
      {
        path: 'landing-page',
        loadChildren: () => import('./features/landing-page/landing-page.routes'),
      },
      {
        path: 'pdf-masking-form',
        loadChildren: () => import('./features/pdf-masking-form/pdf-masking-form.routes'),
        title: 'formulaire',
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./core/layout/not-found/not-found.component'),
    title: '404 - page non trouvée',
  },
];
