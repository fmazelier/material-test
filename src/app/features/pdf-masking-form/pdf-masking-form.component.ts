import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatStepper, MatStepperModule, StepperOrientation } from '@angular/material/stepper';
import { finalize, switchMap } from 'rxjs';

import { FileInputComponent } from '@mazelab/ng-kit/form';
import { IconComponent } from '@mazelab/ng-kit/icon';
import { SnackbarService } from '@mazelab/ng-kit/snackbar';

import { LucideCircleCheckBig, LucidePencil } from '@lucide/angular';

import { VariantsListComponent } from './components/variants-list/variants-list.component';
import { PdfMasking } from './services/pdf-masking/pdf-masking.abstract';
import { VariantsStoreService } from './services/variants-store/variants-store.service';

const STEPPER_MIN_WIDTH_FOR_HORIZONTAL = 600;

@Component({
  selector: 'app-pdf-masking-form',
  imports: [
    FileInputComponent,
    MatStepperModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatCardModule,
    IconComponent,
    VariantsListComponent,
  ],
  templateUrl: './pdf-masking-form.component.html',
  styles: `
    :host::ng-deep .mat-horizontal-content-container,
    :host::ng-deep .mat-vertical-content-container {
      margin-top: 8px;
    }
    :host {
      // Required for ResizeObserver (custom elements are inline by default)
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PdfMaskingFormComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackbarService = inject(SnackbarService);
  private readonly pdfMaskingService = inject(PdfMasking);
  private readonly variantsStore = inject(VariantsStoreService);

  protected readonly stepper = viewChild.required(MatStepper);
  private readonly host = inject(ElementRef);

  private readonly observer = new ResizeObserver(([entry]) => {
    const orientation =
      entry.contentRect.width < STEPPER_MIN_WIDTH_FOR_HORIZONTAL ? 'vertical' : 'horizontal';
    this.stepperOrientation.set(orientation);
  });

  protected readonly icons = {
    check: LucideCircleCheckBig,
    pencil: LucidePencil,
  };
  protected readonly stepperOrientation = signal<StepperOrientation>('horizontal');

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

  constructor() {
    afterNextRender(() => {
      this.observer.observe(this.host.nativeElement);
    });

    this.destroyRef.onDestroy(() => {
      this.observer.disconnect();
    });
  }

  uploadVariants(file: File): void {
    this.sendingText.set(true);

    this.pdfMaskingService
      .uploadVariants(file)
      .pipe(
        finalize(() => this.sendingText.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.snackbarService.success('Fichier texte reçu avec succès');
        this.variantsStore.reset();
        this.stepper().next();
      });
  }

  uploadPdf(file: File): void {
    this.sendingPdf.set(true);
    this.pdfMaskingService
      .uploadPdf(file)
      .pipe(
        switchMap((res) => {
          return this.pdfMaskingService.fetchAndDownloadProcessedPdf(res.data.processed_filename);
        }),
        finalize(() => this.sendingPdf.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.stepper().selectedIndex = this.stepper().steps.length - 1;
      });
  }

  protected resetStepper(): void {
    this.stepper().reset();
  }
}
