import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';

export type AlertDialogData = {
  /** Title displayed at the top of the dialog */
  title: string;
  /** Main message displayed in the body */
  message: string;
  /** Label for the close button (default: 'OK') */
  closeLabel?: string;
};

@Component({
  selector: 'app-alert-dialog',
  imports: [MatButtonModule, MatDialogActions, MatDialogClose, MatDialogTitle, MatDialogContent],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions>
      <button matButton [mat-dialog-close]="true" cdkFocusInitial>
        {{ data.closeLabel ?? 'OK' }}
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertDialogComponent {
  protected readonly data = inject<AlertDialogData>(MAT_DIALOG_DATA);
}
