import { Routes } from '@angular/router';

import ProductsComponent from './products.component';
import { ProductsStoreService } from './services/products-store/products-store.service';

const productsRoutes: Routes = [
  {
    path: '',
    component: ProductsComponent,
    providers: [ProductsStoreService],
  },
  {
    path: 'categories',
    children: [
      {
        path: '',
        loadComponent: () => import('./product-section/product-section.component'),
        data: { heading: 'Catégories' },
        title: 'catégories',
      },
      {
        path: 'electronics',
        loadComponent: () => import('./product-section/product-section.component'),
        data: { heading: 'Électronique' },
        title: 'électronique',
      },
      {
        path: 'clothing',
        loadComponent: () => import('./product-section/product-section.component'),
        data: { heading: 'Vêtements' },
        title: 'vêtements',
      },
    ],
  },
  {
    path: 'orders',
    loadComponent: () => import('./product-section/product-section.component'),
    data: { heading: 'Commandes' },
    title: 'commandes',
  },
];

export default productsRoutes;
