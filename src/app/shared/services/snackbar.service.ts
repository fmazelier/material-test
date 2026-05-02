import { inject, Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

import { SnackbarComponent } from '@shared/components/snackbar/snackbar.component';

export type SnackbarType = 'success' | 'error' | 'warning' | 'info';

export type SnackbarData = {
  type: SnackbarType;
  title: string;
  message?: string;
  duration: number;
};

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private readonly snackBar = inject(MatSnackBar);

  private readonly baseConfig: MatSnackBarConfig<SnackbarData> = {
    duration: 4000,
    horizontalPosition: 'center',
    verticalPosition: 'top',
  };

  success(title: string, message?: string): void {
    this.open('success', title, message);
  }

  error(title: string, message?: string): void {
    this.open('error', title, message, { duration: 0 });
  }

  warning(title: string, message?: string): void {
    this.open('warning', title, message);
  }

  info(title: string, message?: string): void {
    this.open('info', title, message);
  }

  open(
    type: SnackbarType,
    title: string,
    message?: string,
    overrides: MatSnackBarConfig = {}
  ): void {
    const duration = overrides.duration ?? (this.baseConfig.duration as number);

    this.snackBar.openFromComponent<SnackbarComponent, SnackbarData>(SnackbarComponent, {
      ...this.baseConfig,
      ...overrides,
      panelClass: [`snack-${type}`],
      data: { title, message, type, duration },
    });
  }
}
