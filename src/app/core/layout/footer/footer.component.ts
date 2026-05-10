import { DatePipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  imports: [NgOptimizedImage, DatePipe],
  template: `
    <footer class="flex flex-col items-center gap-2 p-4 @[400px]:flex-row @[400px]:justify-between">
      <a
        class="@[400px]:order-2"
        href="https://www.safran-group.com/companies/safran-aircraft-engines"
        target="_blank"
      >
        <img ngSrc="images/logo-safran.webp" width="32" height="35" alt="Logo de safran" />
      </a>
      <p class="font-medium @[400px]:order-1">
        Copyright © Safran Aircraft Engines {{ currentDate | date: 'y' }}
      </p>
    </footer>
  `,
  styles: `
    :host {
      container-type: inline-size;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  protected readonly currentDate = new Date();
}
