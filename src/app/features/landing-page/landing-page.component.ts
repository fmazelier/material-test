import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';

import { LottieDirective, LottieOptions } from '@mazelab/ng-kit/directive';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, MatButtonModule, LottieDirective, MatCardModule],
  template: `
    <div
      class="flex flex-col items-center justify-center text-center lg:grid lg:grid-cols-2 lg:items-center lg:justify-center lg:gap-12 lg:text-left"
    >
      <div class="flex flex-col items-center lg:items-start">
        <h1 class="animate-fade-in-up mb-0 text-4xl font-semibold text-balance lg:text-5xl">
          Masquez les données sensibles de vos
          <span class="animated-gradient-text">documents PDF</span>
        </h1>

        <p
          class="text-on-surface/60 animate-fade-in-up mt-8 mb-8 text-lg [animation-delay:150ms]! lg:mb-0 lg:text-xl"
        >
          Importez un fichier, sélectionnez les termes à anonymiser et générez une version sécurisée
          en quelques secondes.
        </p>

        <a
          class="animate-fade-in-up mt-8 hidden! [animation-delay:300ms]! lg:mt-12 lg:inline-flex!"
          matButton="filled"
          routerLink="/pdf-masking-form"
        >
          Démarrer
        </a>
      </div>

      <mat-card
        class="mat-card-color-elev-3 animate-fade-in-up mx-auto max-h-100 w-full max-w-100 overflow-hidden [animation-delay:350ms]!"
      >
        <div mlkLottie [options]="lottieOptions"></div>
      </mat-card>

      <a
        class="animate-fade-in-up mt-8 mb-4 [animation-delay:550ms]! lg:hidden!"
        matButton="filled"
        routerLink="/pdf-masking-form"
        >Commencer</a
      >
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LandingPageComponent {
  protected readonly lottieOptions: LottieOptions = {
    path: 'lottie-animations/pdf-scanning.json',
  };
}
