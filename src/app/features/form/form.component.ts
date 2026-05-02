import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { finalize, switchMap } from 'rxjs';

import { FileUploadInputComponent } from '@shared/components/file-upload-input/file-upload-input.component';

import { PdfMaskingService } from './services/form.service';
import { PdfMaskingMockService } from './services/pdf-masking.mock.service';

@Component({
  selector: 'app-pdf-masking-form',
  imports: [
    FileUploadInputComponent,
    MatStepperModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './form.component.html',
  styles: `
    @use '@angular/material' as mat;

    :host::ng-deep .mat-horizontal-content-container {
      margin-top: 16px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: PdfMaskingService, useClass: PdfMaskingMockService }],
})
export default class PdfMaskingFormComponent {
  private readonly pdfMaskingService = inject(PdfMaskingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly stepper = viewChild.required(MatStepper);

  protected readonly sendingText = signal(false);
  protected readonly sendingPdf = signal(false);

  protected readonly textControl = new FormControl<File[]>([], Validators.required);
  protected readonly pdfControl = new FormControl<File[]>([], Validators.required);

  uploadText(file: File): void {
    this.sendingText.set(true);
    this.pdfMaskingService
      .uploadTextFile(file)
      .pipe(
        finalize(() => this.sendingText.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.snackBar.open('Fichier texte reçu avec succès');
        this.stepper().next();
      });
  }

  uploadPdf(file: File): void {
    this.sendingPdf.set(true);
    this.pdfMaskingService
      .uploadPdf(file)
      .pipe(
        switchMap((res) => {
          return this.pdfMaskingService.downloadProcessedPdf(res.data.processed_filename);
        }),
        finalize(() => this.sendingPdf.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.stepper().selectedIndex = this.stepper().steps.length - 1;
      });
  }
}
