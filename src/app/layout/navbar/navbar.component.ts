import { MediaMatcher } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive } from "@angular/router";
import { ThemeService } from '../../core/services/theme.service';

type NavLink = {
  label: string;
  href: string;
}

@Component({
  selector: 'app-navbar',
  imports: [
    MatToolbarModule, MatButtonModule, MatIconModule, MatSidenavModule, MatListModule,
    RouterLink, RouterLinkActive
],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly media = inject(MediaMatcher);
  protected readonly themeService = inject(ThemeService);

  protected readonly isMobile = signal(true);

  private readonly _mobileQuery: MediaQueryList;
  private readonly _mobileQueryListener: () => void;

  protected readonly navLinks: NavLink[] = [
    { label: 'Home', href: '/' },
    { label: 'Form', href: '/form' },
  ];

  constructor() {
    this._mobileQuery = this.media.matchMedia('(max-width: 600px)');
    this.isMobile.set(this._mobileQuery.matches);
    this._mobileQueryListener = () => this.isMobile.set(this._mobileQuery.matches);
    this._mobileQuery.addEventListener('change', this._mobileQueryListener);
  }
}
