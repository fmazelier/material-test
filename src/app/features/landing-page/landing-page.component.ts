import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';

import { LottieDirective, LottieOptions } from '@shared/directives/lottie.directive';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, MatButtonModule, LottieDirective, MatCardModule],
  template: `
    <div class="flex flex-col items-center text-center">
      <h1 class="text-4xl mb-0 animate-fade-in-up">
        Masquez les mots importants <span class="text-primary"> de votre PDF</span>
      </h1>
      <p class="text-lg text-on-surface/60 mt-8 mb-16 animate-fade-in-up [animation-delay:150ms]!">
        Confiez-nous une liste de mots, un fichier PDF et on s'occupe du reste
      </p>
      <mat-card
        class="h-full w-full max-w-100 max-h-100 overflow-hidden mat-card-color-elev-5 animate-fade-in-up [animation-delay:350ms]!"
      >
        <div appLottie [options]="lottieOptions"></div>
      </mat-card>
      <a
        class="mt-16 animate-fade-in-up [animation-delay:550ms]!"
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
