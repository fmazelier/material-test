import { Routes } from '@angular/router';

import { MainLayoutComponent } from '@core/layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
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
      {
        path: 'products',
        loadChildren: () => import('./features/products/products.routes'),
        title: 'produits',
      },
    ],
  },
  {
    path: 'forbidden',
    loadComponent: () => import('@mazelab/ng-kit/ui').then((m) => m.ErrorPageComponent),
    title: '403 - accès interdit',
  },
  {
    path: '**',
    loadComponent: () => import('@mazelab/ng-kit/ui').then((m) => m.ErrorPageComponent),
    title: '404 - page non trouvée',
  },
];
