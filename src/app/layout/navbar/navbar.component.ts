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
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { map } from 'rxjs';

import { ThemeService } from '@core/services/theme.service';

type NavLink = {
  label: string;
  href: string;
  icon: string;
};

@Component({
  selector: 'app-navbar',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-mobile]': 'isMobile()',
  },
})
export class NavbarComponent {
  protected readonly themeService = inject(ThemeService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  private readonly sidenav = viewChild.required(MatSidenav);

  protected readonly isMobile: Signal<boolean> = toSignal(
    this.breakpointObserver.observe('(max-width: 600px)').pipe(map(({ matches }) => matches)),
    { initialValue: false }
  );
  protected readonly isCollapsed = signal(false);

  protected readonly navLinks: NavLink[] = [
    { label: 'Accueil', href: '/landing-page', icon: 'home' },
    { label: 'Transformer un PDF', href: '/pdf-masking-form', icon: 'picture_as_pdf' },
  ];

  constructor() {
    effect(() => {
      const mobile = this.isMobile();

      // update the sidenav state based on the screen size
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
