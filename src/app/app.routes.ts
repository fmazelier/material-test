import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./features/landing-page/landing-page.component'),
  },
  {
    path: 'pdf-masking-form',
    loadComponent: () => import('./features/pdf-masking-form/pdf-masking-form.component'),
    title: 'formulaire',
  },
];
