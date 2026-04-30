import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavbarComponent } from '@layout/navbar/navbar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <app-navbar>
      <router-outlet />
    </app-navbar>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
