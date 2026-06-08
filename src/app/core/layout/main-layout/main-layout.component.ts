import { ChangeDetectionStrategy, Component } from '@angular/core';

import { MlkMainLayoutComponent, NavLink } from '@mazelab/ng-kit/ui';

import {
  LucideBoxes,
  LucideCpu,
  LucideFileText,
  LucideHouse,
  LucideListOrdered,
  LucideShirt,
  LucideShoppingCart,
  LucideStore,
} from '@lucide/angular';

@Component({
  selector: 'app-main-layout',
  imports: [MlkMainLayoutComponent],
  template: `
    <mlk-main-layout [navLinks]="navLinks">
      <h1 app-name>AnOS</h1>
    </mlk-main-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  protected readonly navLinks: NavLink[] = [
    { label: 'Accueil', href: '/landing-page', icon: LucideHouse },
    {
      label: 'Produits',
      icon: LucideShoppingCart,
      href: '/products',
      children: [
        { label: 'Vue d’ensemble', href: '/products', icon: LucideStore },
        {
          label: 'Catégories',
          href: '/products/categories',
          icon: LucideBoxes,
          children: [
            { label: 'Électronique', href: '/products/categories/electronics', icon: LucideCpu },
            { label: 'Vêtements', href: '/products/categories/clothing', icon: LucideShirt },
          ],
        },
        { label: 'Commandes', href: '/products/orders', icon: LucideListOrdered },
      ],
    },
    { label: 'Masquer un PDF', href: '/pdf-masking-form', icon: LucideFileText },
  ];
}
