import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Signal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';

import { FooterComponent } from '@core/layout/footer/footer.component';
import { ThemeService } from '@core/services/theme.service';
import { IconComponent } from '@shared/components/icon/icon.component';

import {
  LucideFileText,
  LucideHouse,
  LucideIcon,
  LucideMenu,
  LucideMoon,
  LucideShoppingCart,
  LucideSun,
} from '@lucide/angular';

type NavLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

@Component({
  selector: 'app-shell',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    RouterLink,
    RouterOutlet,
    RouterLinkActive,
    FooterComponent,
    IconComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col absolute inset-0',
    '[class.is-mobile]': 'isMobile()',
  },
})
export class ShellComponent {
  protected readonly themeService = inject(ThemeService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  private readonly sidenav = viewChild.required(MatSidenav);

  protected readonly isMobile: Signal<boolean> = toSignal(
    this.breakpointObserver.observe('(max-width: 600px)').pipe(map(({ matches }) => matches)),
    { initialValue: false }
  );
  protected readonly isCollapsed = signal(false);

  protected readonly icons = {
    menu: LucideMenu,
    moon: LucideMoon,
    sun: LucideSun,
    home: LucideHouse,
    file: LucideFileText,
  };

  protected readonly navLinks: NavLink[] = [
    { label: 'Accueil', href: '/landing-page', icon: LucideHouse },
    { label: 'Masquer un PDF', href: '/pdf-masking-form', icon: LucideFileText },
    { label: 'Produits', href: '/products', icon: LucideShoppingCart },
  ];

  constructor() {
    effect(() => {
      const mobile = this.isMobile();

      untracked(() => {
        if (mobile) {
          this.sidenav().close();
          this.isCollapsed.set(false);
        } else {
          this.sidenav().open();
        }
      });
    });
  }

  updateSidenavState(): void {
    if (this.isMobile()) {
      this.sidenav().toggle();
    } else {
      this.isCollapsed.update((value) => !value);
    }
  }
}
