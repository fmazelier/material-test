import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export type PromptDialogData = {
  /** Title displayed at the top of the dialog */
  title: string;
  /** Helper text displayed above the input field */
  message?: string;
  /** Label for the input field */
  label?: string;
  /** Placeholder text for the input field */
  placeholder?: string;
  /** Pre-filled value for the input field */
  initialValue?: string;
  /** Label for the confirm button (default: 'Confirmer') */
  confirmLabel?: string;
  /** Label for the cancel button (default: 'Annuler') */
  cancelLabel?: string;
};

@Component({
  selector: 'app-prompt-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogTitle,
    MatDialogContent,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <mat-dialog-content>
      @if (data.message) {
        <p>{{ data.message }}</p>
      }
      <mat-form-field class="w-full pt-4">
        @if (data.label) {
          <mat-label>{{ data.label }}</mat-label>
        }
        <input
          cdkFocusInitial
          matInput
          [formControl]="control"
          [placeholder]="data.placeholder ?? ''"
          (keydown.enter)="submit()"
        />
        @if (control.invalid) {
          <mat-error>Ce champs est requis</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions>
      <button matButton [mat-dialog-close]="undefined">{{ data.cancelLabel ?? 'Annuler' }}</button>
      <button matButton [disabled]="control.invalid" (click)="submit()">
        {{ data.confirmLabel ?? 'Confirmer' }}
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptDialogComponent {
  private readonly dialogRef = inject<MatDialogRef<PromptDialogComponent, string>>(MatDialogRef);
  protected readonly data = inject<PromptDialogData>(MAT_DIALOG_DATA);

  protected readonly control = new FormControl(this.data.initialValue ?? '', {
    nonNullable: true,
    validators: [Validators.required],
  });

  protected submit(): void {
    if (this.control.invalid) {
      this.control.markAsTouched();
      return;
    }
    this.dialogRef.close(this.control.value);
  }
}
