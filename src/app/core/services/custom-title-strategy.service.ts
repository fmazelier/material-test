import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

@Injectable()
export class CustomTitleStrategyService extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(routerState: RouterStateSnapshot): void {
    const title = this.buildTitle(routerState);
    this.title.setTitle(title ? `Material-test - ${title}` : 'Material-test');
  }
}
