import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, switchMap } from 'rxjs';

import { FileUploadInputComponent } from '@shared/components/file-upload-input/file-upload-input.component';

import { PdfMaskingService } from './services/form.service';

@Component({
  selector: 'app-pdf-masking-form',
  imports: [FileUploadInputComponent],
  template: `
    <div class="flex flex-wrap gap-4">
      <app-file-upload-input
        class="flex-1 min-w-125"
        label="Fichier texte contenant les mots à masquer"
        additionalInformations="Le fichier texte doit contenir un mot par ligne"
        accept=".txt"
        [loading]="loadingText()"
        showSubmitButton
        dragDropEnabled
        (uploadTriggered)="uploadText($event[0])"
      />
      <app-file-upload-input
        class="flex-1 min-w-125"
        label="Fichier PDF à traiter"
        loadingLabel="Traitement en cours..."
        additionalInformations="Le téléchargement du PDF masqué se lancera automatiquement après l'envoi"
        accept=".pdf"
        [loading]="loadingPdf()"
        dragDropEnabled
        showSubmitButton
        (uploadTriggered)="uploadPdf($event[0])"
      />
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PdfMaskingFormComponent {
  private readonly pdfMaskingService = inject(PdfMaskingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loadingText = signal(false);
  protected readonly loadingPdf = signal(false);

  uploadText(file: File): void {
    this.loadingText.set(true);
    this.pdfMaskingService
      .uploadTextFile(file)
      .pipe(
        finalize(() => this.loadingText.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.snackBar.open('Fichier texte reçu avec succès');
      });
  }

  uploadPdf(file: File): void {
    this.loadingPdf.set(true);
    this.pdfMaskingService
      .uploadPdf(file)
      .pipe(
        switchMap((res) => {
          return this.pdfMaskingService.downloadProcessedPdf(res.data.processed_filename);
        }),
        finalize(() => this.loadingPdf.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.snackBar.open('Le PDF masqué a été téléchargé avec succès');
      });
  }
}
