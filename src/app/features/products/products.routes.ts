import { Routes } from '@angular/router';

import ProductsComponent from './products.component';
import { ProductsStoreService } from './services/products-store/products-store.service';

const productsRoutes: Routes = [
  {
    path: '',
    component: ProductsComponent,
    providers: [ProductsStoreService],
  },
];

export default productsRoutes;
