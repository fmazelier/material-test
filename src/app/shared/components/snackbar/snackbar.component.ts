import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarAction,
  MatSnackBarActions,
  MatSnackBarLabel,
  MatSnackBarRef,
} from '@angular/material/snack-bar';

import { SnackbarData, SnackbarType } from '@shared/services/snackbar.service';

import {
  LucideBadgeCheck,
  LucideCircleAlert,
  LucideIcon,
  LucideInfo,
  LucideTriangleAlert,
  LucideX,
} from '@lucide/angular';

import { IconComponent } from '../icon/icon.component';

const SNACKBAR_ICONS: Record<SnackbarType, LucideIcon> = {
  success: LucideBadgeCheck,
  error: LucideCircleAlert,
  warning: LucideTriangleAlert,
  info: LucideInfo,
};

@Component({
  selector: 'app-snackbar',
  imports: [
    MatButtonModule,
    MatSnackBarLabel,
    MatSnackBarActions,
    MatSnackBarAction,
    IconComponent,
  ],
  template: `
    <div class="relative flex w-full flex-col pt-2.5 pb-3 pl-2">
      <div class="flex h-6.5 items-center">
        <div matSnackBarLabel class="flex items-center gap-2 px-1! py-0!">
          <mat-icon appIcon [icon]="icon" class="snackbar-icon" />

          <span>{{ data.title }}</span>
        </div>
        <div matSnackBarActions>
          <button matSnackBarAction matIconButton (click)="ref.dismissWithAction()">
            <mat-icon appIcon [icon]="icons.x" />
          </button>
        </div>
      </div>

      @if (data.message) {
        <div class="text-on-surface px-10 whitespace-pre-line">{{ data.message }}</div>
      }

      @if (data.duration && data.duration > 0) {
        <div
          class="snack-progress-bar absolute bottom-0 left-0 h-1 w-full"
          [attr.data-duration]="data.duration"
        ></div>
      }
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnackbarComponent {
  protected readonly data = inject<SnackbarData>(MAT_SNACK_BAR_DATA);
  protected readonly ref = inject(MatSnackBarRef<SnackbarComponent>);

  protected readonly icon = SNACKBAR_ICONS[this.data.type];

  protected readonly icons = {
    x: LucideX,
  };
}
