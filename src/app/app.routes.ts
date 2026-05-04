import { Routes } from '@angular/router';

export const routes: Routes = [
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
];
