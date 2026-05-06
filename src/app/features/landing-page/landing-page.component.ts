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
    flex flex-col items-center text-center
    md:grid md:grid-cols-2 md:items-center md:text-left md:gap-12 lg:gap-20
  "
    >
      <!-- Colonne gauche : titre + description + CTA -->
      <div class="flex flex-col items-center md:items-start">
        <h1 class="text-4xl mb-0 animate-fade-in-up">
          Masquez les mots importants
          <span class="animated-gradient-text"> de votre PDF</span>
        </h1>

        <p
          class="
        text-lg text-on-surface/60 mt-8
        mb-16 md:mb-0
        animate-fade-in-up [animation-delay:150ms]!
      "
        >
          Confiez-nous une liste de mots, un fichier PDF et on s'occupe du reste
        </p>

        <a
          class="
        mt-8 md:mt-12
        animate-fade-in-up [animation-delay:300ms]!
        hidden! md:inline-flex!
      "
          matButton="filled"
          routerLink="/pdf-masking-form"
        >
          Commencer
        </a>
      </div>

      <!-- Colonne droite : animation Lottie -->
      <mat-card
        class="
      w-full max-w-100 mx-auto mt-16 md:mt-0
      max-h-100 overflow-hidden
      mat-card-color-elev-5
      animate-fade-in-up [animation-delay:350ms]!
    "
      >
        <div appLottie [options]="lottieOptions"></div>
      </mat-card>

      <!-- CTA visible uniquement sur mobile (sous la Lottie) -->
      <a
        class="mt-16 md:hidden! animate-fade-in-up [animation-delay:550ms]!"
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
