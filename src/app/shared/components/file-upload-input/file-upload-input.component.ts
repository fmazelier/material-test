import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  forwardRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

type FileErrorType = 'maxFilesReached' | 'fileTooLarge' | 'fileTypeNotAllowed' | 'duplicateFile';

type FileUploadError = {
  type: FileErrorType;
  message: string;
};

type FileProcessingResult = {
  valid: File[];
  errors: FileUploadError[];
};

// form control errors
export type FileUploadValidationErrors = {
  maxFilesReached?: boolean;
  fileTooLarge?: boolean;
  fileTypeNotAllowed?: boolean;
  duplicateFile?: boolean;
  notSubmitted?: boolean;
};

export const BYTES_PER_KB = 1_024;
export const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;

@Component({
  selector: 'app-file-upload-input',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileUploadInputComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => FileUploadInputComponent),
      multi: true,
    },
  ],
  templateUrl: './file-upload-input.component.html',
  styleUrls: ['./file-upload-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadInputComponent implements ControlValueAccessor, Validator {
  label = input.required();
  accept = input('*/*');
  dragDropEnabled = input(false, { transform: booleanAttribute });
  showSubmitButton = input(false, { transform: booleanAttribute });
  showDeleteAllButton = input(false, { transform: booleanAttribute });
  maxFiles = input(1, { transform: (v: number) => Math.max(1, v) });
  maxSizeMb = input<number>();
  additionalInformations = input<string>();
  loading = input<boolean>();
  loadingLabel = input<string>('Envoi en cours...');

  readonly uploadTriggered = output<File[]>();

  private readonly fileInputRef = viewChild.required<ElementRef<HTMLInputElement>>('fileInputRef');

  protected readonly files = signal<File[]>([]);
  protected readonly isDragging = signal(false);
  protected readonly isDisabled = signal(false);
  protected readonly uploadErrors = signal<FileUploadError[]>([]);

  protected readonly multiple = computed(() => this.maxFiles() > 1);

  protected readonly acceptedTypesTooltipLabel = computed(() => {
    if (this.accept() === '*/*') return;
    if (this.accept().split(',').length > 1) return `Types acceptés : ${this.accept()}`;
    return `Type accepté : ${this.accept()}`;
  });

  protected readonly submitButtonTooltilpLabel = computed(() => {
    if (this.files().length === 0) return 'Aucun fichier sélectionné';
    if (this.loading()) return this.loadingLabel();
    return `Envoyer ${this.files().length} fichier${this.files().length > 1 ? 's' : ''}`;
  });

  protected readonly informationsTooltipLabel = computed(() => {
    const label = [];
    if (this.additionalInformations()) label.push(this.additionalInformations());
    if (this.maxSizeMb()) label.push(`Taille maximum par fichier : ${this.maxSizeMb()}Mo`);
    return label.join(' - ');
  });

  // Tracks whether files have been selected but not yet submitted.
  // Only relevant when showSubmitButton is true (independent submit flow).
  private readonly pendingSubmit = signal(false);

  constructor() {
    // Re-runs whenever files change. Sets pendingSubmit only in independent
    // submit mode, forcing the user to explicitly trigger upload().
    effect(() => {
      this.files();

      if (this.showSubmitButton()) {
        this.pendingSubmit.set(true);
      }
    });
  }

  private onChange: (value: File[]) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: File[] | null): void {
    this.files.set(value ?? []);
  }

  registerOnChange(fn: (value: File[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  /** Exposes validation errors to Angular forms */
  validate(): ValidationErrors | null {
    const errors: FileUploadValidationErrors = {};

    if (this.pendingSubmit() && this.showSubmitButton()) {
      errors.notSubmitted = true;
    }

    for (const err of this.uploadErrors()) {
      errors[err.type] = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  onDragOver(event: DragEvent): void {
    if (!this.dragDropEnabled() || this.isDisabled() || this.loading()) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    if (!this.dragDropEnabled() || this.isDisabled() || this.loading()) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    const droppedFiles = Array.from(event.dataTransfer?.files ?? []);
    this.addFiles(droppedFiles);
  }

  /** Handles native file input change */
  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    this.addFiles(selected);
    // Reset input so the same file can be re-selected
    input.value = '';
  }

  /** Opens file picker via mouse or keyboard */
  openFilePicker(event: PointerEvent | KeyboardEvent): void {
    if (this.isDisabled() || this.loading()) return;
    if (
      event instanceof PointerEvent ||
      (event instanceof KeyboardEvent && ['Space', 'Enter'].includes(event.code))
    ) {
      this.fileInputRef().nativeElement.click();
    }
  }

  /** Emits files if submit button is enabled */
  upload(): void {
    if (this.showSubmitButton() && !this.loading()) {
      const files = this.files();
      this.pendingSubmit.set(false);
      this.onChange(files);
      this.uploadTriggered.emit(files);
    }
    this.onTouched();
  }

  /** Clears all files and errors */
  cancelAll(): void {
    this.files.set([]);
    this.uploadErrors.set([]);
    this.pendingSubmit.set(false);
    this.onChange([]);
    this.onTouched();
  }

  removeFile(index: number): void {
    if (this.files().length === 1) {
      this.cancelAll();
      return;
    }

    // Remove only max-files errors when deleting a file
    this.uploadErrors.update((errors) => errors.filter((err) => err.type !== 'maxFilesReached'));

    this.files.update((files) => files.filter((_, i) => i !== index));
    this.onChange(this.files());
    this.onTouched();
  }

  /** Human-readable file size formatter */
  formatSize(bytes: number): string {
    if (bytes < BYTES_PER_KB) return `${bytes} o`;
    if (bytes < BYTES_PER_MB) return `${(bytes / BYTES_PER_KB).toFixed(1)} Ko`;
    return `${(bytes / BYTES_PER_MB).toFixed(1)} Mo`;
  }

  getFileIcon(file: File): string {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'videocam';
    if (file.type.startsWith('audio/')) return 'audiotrack';
    if (file.type === 'application/pdf') return 'picture_as_pdf';
    if (
      file.type.includes('spreadsheet') ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.csv')
    )
      return 'table_chart';
    if (file.type.includes('zip') || file.type.includes('compressed')) {
      return 'folder_zip';
    }
    return 'insert_drive_file';
  }

  /** Adds incoming files after validation */
  private addFiles(incoming: File[]): void {
    const { valid, errors } = this.processIncomingFiles(incoming);

    this.uploadErrors.set(errors);

    let updated: File[];
    if (this.multiple()) {
      // Append valid files in multi-file mode
      updated = [...this.files(), ...valid];
    } else {
      // Do not replace existing file if single-file mode
      if (this.files().length > 0) return;
      updated = valid.slice(0, 1);
    }

    this.files.set(updated);
    this.onChange(updated);
    this.onTouched();
  }

  /** Validates and filters incoming files in a single pass */
  private processIncomingFiles(incoming: File[]): FileProcessingResult {
    const valid: File[] = [];
    const errors: FileUploadError[] = [];
    const existing = this.files();

    for (const file of incoming) {
      // Reject exact duplicates (same name & size)
      if (existing.some((f) => f.name === file.name && f.size === file.size)) {
        errors.push({
          type: 'duplicateFile',
          message: `"${file.name}" : ce fichier est déjà ajouté`,
        });
        continue;
      }

      // Enforce maximum file count
      if (existing.length + valid.length === this.maxFiles()) {
        errors.push({
          type: 'maxFilesReached',
          message: `"${file.name}" : nombre limite de fichiers atteint`,
        });
        continue;
      }

      // Validate MIME type / extension
      if (!this.isAccepted(file)) {
        const acceptedTypesLabel =
          this.accept().split(',').length > 1 ? 'types acceptés :' : 'type accepté :';
        errors.push({
          type: 'fileTypeNotAllowed',
          message: `"${file.name}" : type non accepté, ${acceptedTypesLabel} ${this.accept()}.`,
        });
        continue;
      }

      // Validate file size
      if (this.maxSizeMb() && file.size > this.maxSizeMb()! * BYTES_PER_MB) {
        errors.push({
          type: 'fileTooLarge',
          message: `"${file.name}" : dépasse la limite de ${this.maxSizeMb()} Mo`,
        });
        continue;
      }

      valid.push(file);
    }

    return { valid, errors };
  }

  /** Checks whether a file matches accepted types configuration */
  private isAccepted(file: File): boolean {
    if (!this.accept() || this.accept() === '*/*') return true;

    const acceptedTypes = this.accept()
      .split(',')
      .map((t) => t.trim());

    return acceptedTypes.some((type) => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'));
      }
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type === type;
    });
  }
}
