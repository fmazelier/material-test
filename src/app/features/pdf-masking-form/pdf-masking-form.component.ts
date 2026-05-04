import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Signal,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatStepper, MatStepperModule, StepperOrientation } from '@angular/material/stepper';
import { finalize, map, switchMap } from 'rxjs';

import { FileUploadInputComponent } from '@shared/components/file-upload-input/file-upload-input.component';
import { SnackbarService } from '@shared/services/snackbar.service';

import { PdfMaskingService } from './services/form.service';

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
  templateUrl: './pdf-masking-form.component.html',
  styles: `
    :host::ng-deep .mat-horizontal-content-container,
    :host::ng-deep .mat-vertical-content-container {
      margin-top: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // providers: [{ provide: PdfMaskingService, useClass: PdfMaskingMockService }],
})
export default class PdfMaskingFormComponent {
  private readonly pdfMaskingService = inject(PdfMaskingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackbarService = inject(SnackbarService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  protected readonly stepper = viewChild.required(MatStepper);

  protected readonly stepperOrientation: Signal<StepperOrientation> = toSignal(
    this.breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(map(({ matches }) => (matches ? 'horizontal' : 'vertical'))),
    { initialValue: 'horizontal' }
  );

  protected readonly textControl = new FormControl<File[]>([], {
    validators: Validators.required,
    nonNullable: true,
  });
  protected readonly pdfControl = new FormControl<File[]>([], {
    validators: Validators.required,
    nonNullable: true,
  });

  protected readonly sendingText = signal(false);
  protected readonly sendingPdf = signal(false);

  uploadText(file: File): void {
    this.sendingText.set(true);

    this.pdfMaskingService
      .uploadTextFile(file)
      .pipe(
        finalize(() => this.sendingText.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.snackbarService.success('Fichier texte reçu avec succès');
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
