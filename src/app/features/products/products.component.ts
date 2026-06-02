/* eslint-disable @typescript-eslint/no-magic-numbers */
import { CurrencyPipe, DecimalPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { IconComponent } from '@shared/components/icon/icon.component';

import { LucideSearch, LucideSearchX, LucideX } from '@lucide/angular';

import { ProductSortField } from './models/product.model';
import { ProductsStoreService } from './services/products-store/products-store.service';

@Component({
  selector: 'app-products',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    NgOptimizedImage,
    IconComponent,
  ],
  styles: [
    `
      :host {
        display: block;
        --mat-table-header-headline-weight: 600;
        --mat-table-header-headline-size: 0.6875rem;
        --mat-table-header-headline-tracking: 0.08em;
        --mat-table-row-item-container-height: 72px;
      }
    `,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <!-- En-tête -->
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 class="mat-headline-5 m-0">Produits</h2>
          <p class="mat-body-2 mt-1 text-gray-500 dark:text-gray-400">
            @if (store.loading() && store.totalItems() === 0) {
              Chargement…
            } @else {
              {{ store.totalItems() }} produit{{ store.totalItems() !== 1 ? 's' : '' }}
            }
          </p>
        </div>
      </div>

      <!-- Filtres -->
      <div class="flex flex-wrap items-center gap-4">
        <mat-form-field class="min-w-60 flex-1" subscriptSizing="dynamic" appearance="outline">
          <mat-label>Rechercher</mat-label>
          <mat-icon matPrefix appIcon [icon]="icons.search" />
          <input
            matInput
            type="text"
            [ngModel]="searchValue"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Rechercher un produit…"
          />
          @if (searchValue) {
            <button
              matSuffix
              mat-icon-button
              aria-label="Effacer la recherche"
              (click)="onSearchChange('')"
            >
              <mat-icon appIcon [icon]="icons.close" />
            </button>
          }
        </mat-form-field>

        <mat-form-field class="min-w-50" subscriptSizing="dynamic" appearance="outline">
          <mat-label>Catégorie</mat-label>
          <mat-select
            [value]="store.filters().category ?? ''"
            (selectionChange)="onCategoryChange($event.value)"
          >
            <mat-option value="">Toutes les catégories</mat-option>
            @for (cat of store.categories(); track cat.slug) {
              <mat-option [value]="cat.slug">{{ cat.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Carte tableau -->
      <div
        class="relative flex flex-col overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-700"
      >
        <!-- Overlay spinner — couvre le tableau uniquement, pas le paginator -->
        @if (store.loading()) {
          <div
            class="absolute inset-0 bottom-14 z-10 flex items-center justify-center bg-white/60 dark:bg-gray-900/60"
            aria-label="Chargement en cours"
            aria-live="polite"
          >
            <mat-spinner diameter="48" />
          </div>
        }

        <!-- Zone de défilement — tableau uniquement -->
        <div class="max-h-[calc(100dvh-22rem)] min-h-52 overflow-auto">
          <table
            mat-table
            matSort
            [dataSource]="store.items()"
            (matSortChange)="onSortChange($event)"
            class="w-full"
          >
            <ng-container matColumnDef="thumbnail">
              <th mat-header-cell *matHeaderCellDef class="w-18!"></th>
              <td mat-cell *matCellDef="let product" class="w-18!">
                <div
                  class="relative h-14 w-14 overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-800/60"
                >
                  <img
                    [ngSrc]="product.thumbnail"
                    fill
                    [alt]="product.title"
                    class="object-contain p-1"
                  />
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Produit</th>
              <td mat-cell *matCellDef="let product">
                <div class="flex flex-col gap-0.5 py-1">
                  <span class="leading-snug font-medium text-gray-900 dark:text-gray-100">
                    {{ product.title }}
                  </span>
                  @if (product.brand) {
                    <span class="text-xs text-gray-400 dark:text-gray-500">
                      {{ product.brand }}
                    </span>
                  }
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="price">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Prix</th>
              <td mat-cell *matCellDef="let product">
                <span class="font-semibold text-gray-900 dark:text-gray-100">
                  {{ product.price | currency: 'USD' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="rating">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Note</th>
              <td mat-cell *matCellDef="let product">
                <span [class]="ratingBadgeClass(product.rating)">
                  ★ {{ product.rating | number: '1.1-1' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef>Catégorie</th>
              <td mat-cell *matCellDef="let product">
                <span
                  class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 capitalize dark:bg-gray-800 dark:text-gray-300"
                >
                  {{ product.category }}
                </span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>

          @if (store.isEmpty() && !store.loading()) {
            <div class="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
              <mat-icon appIcon [icon]="icons.searchX" />
              <p class="mat-body-2 m-0">Aucun produit trouvé pour ces critères.</p>
            </div>
          }
        </div>

        <!-- Paginateur — toujours visible, hors zone de défilement -->
        <div class="shrink-0 border-t border-gray-200 dark:border-gray-700">
          <mat-paginator
            [length]="store.totalItems()"
            [pageSize]="store.pageSize()"
            [pageIndex]="store.currentPage() - 1"
            [pageSizeOptions]="[5, 10, 25, 50]"
            showFirstLastButtons
            (page)="onPageChange($event)"
          />
        </div>
      </div>
    </div>
  `,
})
export default class ProductsComponent {
  protected readonly store = inject(ProductsStoreService);

  protected readonly displayedColumns = ['thumbnail', 'title', 'price', 'rating', 'category'];

  protected searchValue = '';

  icons = {
    search: LucideSearch,
    searchX: LucideSearchX,
    close: LucideX,
  };

  constructor() {
    this.store.goToFirstPage();
  }

  protected ratingBadgeClass(rating: number): string {
    if (rating >= 4.5)
      return 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
    if (rating >= 3.5)
      return 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400';
    if (rating >= 2.5)
      return 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
    return 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400';
  }

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
