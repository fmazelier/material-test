import { DatePipe, NgOptimizedImage } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
} from '@angular/core';

const FOOTER_MIN_WIDTH_FOR_ROW_LAYOUT = 400;

@Component({
  selector: 'app-footer',
  imports: [NgOptimizedImage, DatePipe],
  template: `
    <footer
      #footer
      class="p-4 border-t border-on-surface/20 flex"
      [class.flex-col]="isSmall()"
      [class.items-center]="isSmall()"
      [class.gap-2]="isSmall()"
      [class.flex-row]="!isSmall()"
      [class.justify-between]="!isSmall()"
    >
      <img ngSrc="logo-safran.webp" width="50" height="55" alt="Logo de safran" />

      <p class="font-medium">Copyright © Safran Aircraft Engines {{ currentDate | date: 'y' }}</p>
    </footer>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent implements AfterViewInit {
  private readonly host = inject(ElementRef);
  private readonly observer = new ResizeObserver(([entry]) => {
    this.isSmall.set(entry.contentRect.width < FOOTER_MIN_WIDTH_FOR_ROW_LAYOUT);
  });

  protected readonly isSmall = signal(false);
  protected readonly currentDate = new Date();

  ngAfterViewInit(): void {
    this.observer.observe(this.host.nativeElement);
  }
}
