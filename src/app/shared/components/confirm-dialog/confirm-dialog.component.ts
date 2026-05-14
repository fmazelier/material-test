import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

export type ConfirmDialogData = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButtonModule, MatDialogActions, MatDialogClose, MatDialogTitle, MatDialogContent],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content> {{ data.message }} </mat-dialog-content>
    <mat-dialog-actions>
      <button matButton [mat-dialog-close]="false">{{ data.cancelLabel ?? 'Annuler' }}</button>
      <button matButton [mat-dialog-close]="true" cdkFocusInitial>
        {{ data.confirmLabel ?? 'Confirmer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly dialogRef = inject<MatDialogRef<ConfirmDialogComponent, boolean>>(MatDialogRef);
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
