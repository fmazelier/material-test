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
    <div class="flex flex-col w-full relative pl-2 pb-3 pt-2.5">
      <div class="flex items-center h-6.5">
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
        <div class="px-10 text-on-surface whitespace-pre-line">{{ data.message }}</div>
      }

      @if (data.duration && data.duration > 0) {
        <div
          class="absolute bottom-0 left-0 h-1 w-full snack-progress-bar"
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
