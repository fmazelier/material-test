import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { LottieDirective, LottieOptions } from '@shared/directives/lottie.directive';

@Component({
  selector: 'app-not-found',
  imports: [LottieDirective, RouterLink, MatButtonModule],
  template: `
    <h1 class="text-6xl">Page non trouvée</h1>
    <div class="mb-8 max-w-200" appLottie [options]="lottieOptions"></div>
    <a matButton="filled" routerLink="/">Retour à l'accueil</a>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col items-center justify-center min-w-full min-h-screen text-center',
  },
})
export default class NotFoundComponent {
  protected readonly lottieOptions: LottieOptions = {
    path: 'lottie-animations/404-animation.json',
  };
}
