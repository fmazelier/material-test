import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';

import { LottieDirective, LottieOptions } from '@shared/directives/lottie.directive';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, MatButtonModule, LottieDirective, MatCardModule],
  template: `
    <div
      class="
    flex flex-col items-center justify-center text-center
    lg:grid lg:grid-cols-2 lg:items-center lg:justify-center lg:text-left lg:gap-12
  "
    >
      <div class="flex flex-col items-center lg:items-start">
        <h1 class="text-4xl lg:text-5xl mb-0 animate-fade-in-up">
          Masquez les données sensibles de vos
          <span class="animated-gradient-text">documents PDF</span>
        </h1>

        <p
          class="text-lg lg:text-xl mb-8 lg:mb-0 mt-8
         text-on-surface/60 animate-fade-in-up [animation-delay:150ms]!"
        >
          Importez un fichier, sélectionnez les termes à anonymiser et générez une version sécurisée
          en quelques secondes.
        </p>

        <a
          class="mt-8 lg:mt-12
        animate-fade-in-up [animation-delay:300ms]!
        hidden! lg:inline-flex!"
          matButton="filled"
          routerLink="/pdf-masking-form"
        >
          Démarrer
        </a>
      </div>

      <mat-card
        class="
      w-full max-w-100 mx-auto
      max-h-100 overflow-hidden
      mat-card-color-elev-3
      animate-fade-in-up [animation-delay:350ms]!
    "
      >
        <div appLottie [options]="lottieOptions"></div>
      </mat-card>

      <a
        class="mt-8 mb-4 lg:hidden! animate-fade-in-up [animation-delay:550ms]!"
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
