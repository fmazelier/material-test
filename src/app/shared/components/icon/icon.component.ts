import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

import { LucideDynamicIcon, LucideIcon } from '@lucide/angular';

const DEFAULT_ICON_SIZE = 24;

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'mat-icon[appIcon]',
  imports: [LucideDynamicIcon, MatProgressSpinner],
  template: `
    @if (loading()) {
      <mat-spinner [diameter]="svgSize()" />
    } @else {
      <svg [lucideIcon]="icon()" [size]="svgSize()" [strokeWidth]="2"></svg>
    }
  `,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'mat-icon',
    role: 'img',
    'aria-hidden': 'true',
    '[style.width.px]': 'explicitSize()',
    '[style.height.px]': 'explicitSize()',
    '[style.font-size.px]': 'explicitSize()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  icon = input.required<LucideIcon>();
  size = input<number>();
  loading = input<boolean>(false);

  protected explicitSize = computed(() => this.size() ?? null);
  protected svgSize = computed(() => this.size() ?? DEFAULT_ICON_SIZE);
}
