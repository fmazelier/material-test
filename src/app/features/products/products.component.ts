import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { ProductSortField } from './models/product.model';
import { ProductsStoreService } from './services/products-store/products-store.service';

@Component({
  selector: 'app-products',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressBarModule,
    NgOptimizedImage,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <h2 class="mat-headline-5 m-0">Produits</h2>

      <div class="flex flex-wrap items-center gap-4">
        <mat-form-field class="min-w-60 flex-1" subscriptSizing="dynamic">
          <mat-label>Rechercher</mat-label>
          <input
            matInput
            type="text"
            [ngModel]="searchValue"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Rechercher un produit..."
          />
        </mat-form-field>

        <mat-form-field class="min-w-50" subscriptSizing="dynamic">
          <mat-label>Catégorie</mat-label>
          <mat-select
            [value]="store.filters().category ?? ''"
            (selectionChange)="onCategoryChange($event.value)"
          >
            <mat-option value="">Toutes</mat-option>
            @for (cat of store.categories(); track cat.slug) {
              <mat-option [value]="cat.slug">{{ cat.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <div class="relative overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
        @if (store.loading()) {
          <mat-progress-bar mode="indeterminate" class="absolute top-0 left-0 z-10 w-full" />
        }

        <table
          mat-table
          matSort
          [dataSource]="store.items()"
          (matSortChange)="onSortChange($event)"
          class="w-full"
        >
          <ng-container matColumnDef="thumbnail">
            <th mat-header-cell *matHeaderCellDef>Image</th>
            <td mat-cell *matCellDef="let product">
              <img
                [ngSrc]="product.thumbnail"
                height="40"
                width="40"
                [alt]="product.title"
                class="h-10 w-10 rounded object-cover"
              />
            </td>
          </ng-container>

          <ng-container matColumnDef="title">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Titre</th>
            <td mat-cell *matCellDef="let product">{{ product.title }}</td>
          </ng-container>

          <ng-container matColumnDef="brand">
            <th mat-header-cell *matHeaderCellDef>Marque</th>
            <td mat-cell *matCellDef="let product">{{ product.brand }}</td>
          </ng-container>

          <ng-container matColumnDef="price">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Prix</th>
            <td mat-cell *matCellDef="let product">{{ product.price | currency: 'USD' }}</td>
          </ng-container>

          <ng-container matColumnDef="rating">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Note</th>
            <td mat-cell *matCellDef="let product">{{ product.rating }}/5</td>
          </ng-container>

          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>Catégorie</th>
            <td mat-cell *matCellDef="let product">{{ product.category }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>

        @if (store.isEmpty()) {
          <div class="p-8 text-center text-gray-500">Aucun produit trouvé.</div>
        }
      </div>

      <mat-paginator
        [length]="store.totalItems()"
        [pageSize]="store.pageSize()"
        [pageIndex]="store.currentPage() - 1"
        [pageSizeOptions]="[5, 10, 25, 50]"
        showFirstLastButtons
        (page)="onPageChange($event)"
      />
    </div>
  `,
})
export default class ProductsComponent {
  protected readonly store = inject(ProductsStoreService);

  protected readonly displayedColumns = [
    'thumbnail',
    'title',
    'brand',
    'price',
    'rating',
    'category',
  ];

  protected searchValue = '';

  protected onSearchChange(value: string): void {
    this.searchValue = value;
    this.store.patchFilters({ search: value });
  }

  protected onCategoryChange(slug: string): void {
    this.store.patchFilters({ category: slug || undefined });
  }

  protected onSortChange(sort: Sort): void {
    if (sort.direction) {
      this.store.setSort({ field: sort.active as ProductSortField, direction: sort.direction });
    } else {
      this.store.setSort(null);
    }
  }

  protected onPageChange(event: PageEvent): void {
    if (event.pageSize !== this.store.pageSize()) {
      this.store.setPageSize(event.pageSize);
    } else {
      this.store.goToPage(event.pageIndex + 1);
    }
  }
}
