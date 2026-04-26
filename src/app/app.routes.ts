import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'form',
    loadComponent: () => import('./features/forms/file-upload/file-upload'),
  }
];
