import { DestroyRef, Directive, effect, ElementRef, inject, input, output } from '@angular/core';

import type { AnimationConfigWithData, AnimationConfigWithPath, AnimationItem } from 'lottie-web';
import lottie from 'lottie-web/build/player/esm/lottie_svg.min.js';

export type LottieOptions = Partial<AnimationConfigWithPath | AnimationConfigWithData>;

@Directive({
  selector: '[appLottie]',
})
export class LottieDirective {
  private readonly destroyRef = inject(DestroyRef);

  readonly options = input.required<LottieOptions>();

  readonly animationCreated = output<AnimationItem>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private animationItem: AnimationItem | null = null;

  constructor() {
    effect(() => {
      this.destroyAnimation();

      this.animationItem = lottie.loadAnimation({
        container: this.el.nativeElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        ...this.options(),
      });

      this.animationCreated.emit(this.animationItem);
    });

    this.destroyRef.onDestroy(() => {
      this.destroyAnimation();
    });
  }

  private destroyAnimation(): void {
    this.animationItem?.destroy();
    this.animationItem = null;
  }
}
