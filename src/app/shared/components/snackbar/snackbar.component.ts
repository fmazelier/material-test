import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarAction,
  MatSnackBarActions,
  MatSnackBarLabel,
  MatSnackBarRef,
} from '@angular/material/snack-bar';

import { SnackbarData, SnackbarType } from '@shared/services/snackbar.service';

const SNACKBAR_ICONS: Record<SnackbarType, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

@Component({
  selector: 'app-snackbar',
  imports: [
    MatIconModule,
    MatButtonModule,
    MatSnackBarLabel,
    MatSnackBarActions,
    MatSnackBarAction,
  ],
  template: `
    <div class="flex flex-col w-full relative pl-2 pb-3 pt-2.5">
      <div class="flex items-center h-6.5">
        <div matSnackBarLabel class="flex items-center gap-2 px-2! py-0!">
          <mat-icon class="snackbar-icon">{{ icon }}</mat-icon>
          <span>{{ data.title }}</span>
        </div>
        <div matSnackBarActions>
          <button matSnackBarAction matIconButton (click)="ref.dismissWithAction()">
            <mat-icon>close</mat-icon>
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
}
