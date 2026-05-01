import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { LottieDirective, LottieOptions } from '@shared/directives/lottie.directive';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, MatButtonModule, LottieDirective],
  template: `
    <div class="flex flex-col items-center">
      <h1 class="text-4xl">Masquez les mots importants de votre PDF</h1>
      <p class="text-lg">Confiez-nous une liste de mots, un fichier PDF et on s'occupe du reste</p>
      <a matButton="filled" routerLink="/pdf-masking-form">c'est parti</a>
      <div class="h-full w-full max-w-140 max-h-140" appLottie [options]="lottieOptions"></div>
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
