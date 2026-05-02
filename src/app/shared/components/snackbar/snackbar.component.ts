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
  templateUrl: './snackbar.component.html',
  styleUrl: './snackbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnackbarComponent {
  protected readonly data = inject<SnackbarData>(MAT_SNACK_BAR_DATA);
  protected readonly ref = inject(MatSnackBarRef<SnackbarComponent>);

  protected readonly icon = SNACKBAR_ICONS[this.data.type];
}
