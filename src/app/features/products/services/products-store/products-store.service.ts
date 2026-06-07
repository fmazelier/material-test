import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';

import { PaginatedResult, PaginatedStore } from '@mazelab/ng-kit/store';

import {
  DummyJsonCategory,
  DummyJsonProductsResponse,
  Product,
  ProductFilters,
  ProductSortField,
} from '../../models/product.model';

const PAGE_SIZE = 10;
const BASE_URL = 'https://dummyjson.com/products';
const SELECT_FIELDS = 'id,title,brand,price,rating,category,thumbnail';

@Injectable()
export class ProductsStoreService extends PaginatedStore<
  Product,
  ProductFilters,
  ProductSortField
> {
  private readonly http = inject(HttpClient);

  private readonly _categories = signal<DummyJsonCategory[]>([]);
  readonly categories = this._categories.asReadonly();

  constructor() {
    super({ pageSize: PAGE_SIZE, filterDebounce: 300 });
    this.loadCategories();
  }

  protected fetchPage(page: number): Observable<PaginatedResult<Product>> {
    const filters = this.filters();
    const sort = this.sort();
    const limit = this.pageSize();
    const skip = (page - 1) * limit;

    let params = new HttpParams()
      .set('limit', limit)
      .set('skip', skip)
      .set('select', SELECT_FIELDS);

    if (sort) {
      params = params.set('sortBy', sort.field).set('order', sort.direction);
    }

    let url: string;

    if (filters.category) {
      url = `${BASE_URL}/category/${filters.category}`;
    } else {
      url = `${BASE_URL}/search`;
      params = params.set('q', filters.search ?? '');
    }

    return this.http.get<DummyJsonProductsResponse>(url, { params }).pipe(
      map((res) => ({
        items: res.products,
        totalItems: res.total,
        hasNext: skip + res.products.length < res.total,
      })),
    );
  }

  private loadCategories(): void {
    this.http
      .get<DummyJsonCategory[]>(`${BASE_URL}/categories`)
      .pipe(tap((categories) => this._categories.set(categories)))
      .subscribe();
  }
}
