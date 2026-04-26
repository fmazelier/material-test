import {
  HttpClient,
  HttpErrorResponse,
  HttpEventType,
  HttpHeaders,
  HttpRequest,
} from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';
export type UploadStrategy = 'parallel' | 'sequential' | 'batch';
export type ThemeColor = 'primary' | 'accent' | 'warn';

export interface FileEntry {
  readonly id: string;
  readonly file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

export interface FileValidationError {
  readonly file: File;
  readonly errors: string[];
}

// ---------------------------------------------------------------------------
// Helpers (exported for testing)
// ---------------------------------------------------------------------------

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateId(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-file-dropzone',
  imports: [
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatRippleModule,
    MatTooltipModule,
  ],
  templateUrl: './file-dropzone.component.html',
  styleUrl: './file-dropzone.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileDropzoneComponent),
      multi: true,
    },
  ],
  host: {
    '(dragenter)': 'onDragEnter($event)',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)',
  },
})
export class FileDropzoneComponent implements ControlValueAccessor {
  // --- DI -------------------------------------------------------------------

  private readonly http = inject(HttpClient, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  // --- Core inputs ----------------------------------------------------------

  readonly acceptedTypes = input<string[]>([]);
  readonly maxFiles = input<number>(1);
  readonly maxFileSizeBytes = input<number>(10 * 1024 * 1024);
  readonly disabled = input<boolean>(false);
  readonly label = input<string>('Drag & drop files here or click to browse');
  readonly hint = input<string>('');
  readonly color = input<ThemeColor>('primary');

  // --- Upload inputs --------------------------------------------------------

  readonly uploadUrl = input<string | null>(null);
  readonly uploadFieldName = input<string>('file');
  readonly uploadHeaders = input<Record<string, string>>({});
  readonly uploadOnSelect = input<boolean>(false);
  readonly withCredentials = input<boolean>(false);
  readonly uploadStrategy = input<UploadStrategy>('batch');

  // --- Progress inputs ------------------------------------------------------

  /** `null` = auto-detect: true when uploadUrl is set, false otherwise. */
  readonly showProgressBar = input<boolean | null>(null);
  readonly progressMode = input<'determinate' | 'indeterminate'>('determinate');

  // --- Outputs --------------------------------------------------------------

  readonly filesChanged = output<File[]>();
  readonly validationError = output<FileValidationError[]>();
  readonly uploadStarted = output<void>();
  readonly uploadProgress = output<number>();
  readonly uploadSuccess = output<unknown>();
  readonly uploadError = output<HttpErrorResponse>();

  // --- Internal state -------------------------------------------------------

  protected readonly fileEntries = signal<FileEntry[]>([]);
  protected readonly isDragging = signal(false);
  protected readonly statusAnnouncement = signal('');
  private readonly _cvaDisabled = signal(false);

  // --- Computed -------------------------------------------------------------

  protected readonly effectiveDisabled = computed(
    () => this.disabled() || this._cvaDisabled(),
  );

  protected readonly effectiveShowProgressBar = computed(
    () => this.showProgressBar() ?? this.uploadUrl() !== null,
  );

  protected readonly acceptedTypesString = computed(() =>
    this.acceptedTypes().join(','),
  );

  protected readonly isUploading = computed(() =>
    this.fileEntries().some((e) => e.status === 'uploading'),
  );

  protected readonly overallProgress = computed(() => {
    const entries = this.fileEntries();
    if (!entries.length) return 0;
    return Math.round(
      entries.reduce((sum, e) => sum + e.progress, 0) / entries.length,
    );
  });

  protected readonly isSingleMode = computed(() => this.maxFiles() === 1);

  // --- ViewChild ------------------------------------------------------------

  private readonly fileInputRef =
    viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  // --- Template helper (exposed as property) --------------------------------

  protected readonly formatFileSize = formatFileSize;

  // --- CVA callbacks --------------------------------------------------------

  private onChange: (value: File[]) => void = () => {};
  private onTouched: () => void = () => {};

  // -------------------------------------------------------------------------
  // ControlValueAccessor
  // -------------------------------------------------------------------------

  writeValue(value: File[] | null): void {
    this.fileEntries.set(
      (value ?? []).map((file) => ({
        id: generateId(),
        file,
        status: 'idle' as UploadStatus,
        progress: 0,
      })),
    );
  }

  registerOnChange(fn: (value: File[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._cvaDisabled.set(isDisabled);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Programmatically starts the upload. Requires `uploadUrl` to be set. */
  triggerUpload(): void {
    if (this.uploadUrl()) {
      this.startUpload();
    }
  }

  /** Clears all selected files and resets internal state. */
  reset(): void {
    this.fileEntries.set([]);
    this.fileInputRef().nativeElement.value = '';
    this.notifyChange();
    this.statusAnnouncement.set('Files cleared');
  }

  // -------------------------------------------------------------------------
  // Protected event handlers (called from template / host bindings)
  // -------------------------------------------------------------------------

  protected openFilePicker(): void {
    if (this.effectiveDisabled()) return;
    this.fileInputRef().nativeElement.click();
    this.onTouched();
  }

  protected onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFiles(Array.from(input.files));
    }
    // Reset so selecting the same file again triggers change
    input.value = '';
  }

  protected removeFile(id: string): void {
    if (this.effectiveDisabled()) return;
    this.fileEntries.update((entries) => entries.filter((e) => e.id !== id));
    this.notifyChange();
  }

  protected retryFile(id: string): void {
    const url = this.uploadUrl();
    if (!url) return;
    const entry = this.fileEntries().find((e) => e.id === id);
    if (!entry) return;
    this.updateEntry(id, { status: 'uploading', progress: 0, error: undefined });
    this.uploadSingleFile({ ...entry, status: 'uploading', progress: 0 }, url);
  }

  // --- Drag event handlers (bound via host) ---------------------------------

  protected onDragEnter(event: DragEvent): void {
    event.preventDefault();
    if (
      !this.effectiveDisabled() &&
      event.dataTransfer?.types.includes('Files')
    ) {
      this.isDragging.set(true);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.effectiveDisabled() && event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  protected onDragLeave(event: DragEvent): void {
    // Only leave drag state when pointer exits the host element entirely
    const related = event.relatedTarget as Node | null;
    if (!related || !(event.currentTarget as HTMLElement).contains(related)) {
      this.isDragging.set(false);
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    if (this.effectiveDisabled()) return;
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.handleFiles(Array.from(files));
      this.onTouched();
    }
  }

  // -------------------------------------------------------------------------
  // Private logic
  // -------------------------------------------------------------------------

  private handleFiles(incoming: File[]): void {
    const currentCount = this.fileEntries().length;
    const maxFiles = this.maxFiles();
    const valid: FileEntry[] = [];
    const rejected: FileValidationError[] = [];

    for (const file of incoming) {
      const errors = this.validateFile(file, currentCount + valid.length);
      if (errors.length) {
        rejected.push({ file, errors });
      } else {
        valid.push({ id: generateId(), file, status: 'idle', progress: 0 });
      }
    }

    if (rejected.length) {
      this.validationError.emit(rejected);
    }

    if (!valid.length) return;

    if (maxFiles === 1) {
      this.fileEntries.set([valid[0]]);
    } else {
      this.fileEntries.update((entries) => {
        const slots = maxFiles - entries.length;
        return [...entries, ...valid.slice(0, slots)];
      });
    }

    this.notifyChange();

    if (this.uploadUrl() && this.uploadOnSelect()) {
      this.startUpload();
    }
  }

  private validateFile(file: File, currentCount: number): string[] {
    const errors: string[] = [];
    const maxFiles = this.maxFiles();
    const maxSize = this.maxFileSizeBytes();
    const accepted = this.acceptedTypes();

    if (maxFiles > 0 && currentCount >= maxFiles) {
      errors.push(`Maximum number of files reached (${maxFiles})`);
    }

    if (file.size > maxSize) {
      const mb = (maxSize / (1024 * 1024)).toFixed(0);
      errors.push(`File exceeds maximum size of ${mb} MB`);
    }

    if (accepted.length > 0 && !this.isTypeAccepted(file, accepted)) {
      errors.push('File type not accepted');
    }

    return errors;
  }

  private isTypeAccepted(file: File, accepted: string[]): boolean {
    return accepted.some((type) => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });
  }

  private notifyChange(): void {
    const files = this.fileEntries().map((e) => e.file);
    this.onChange(files);
    this.filesChanged.emit(files);
  }

  private updateEntry(id: string, partial: Partial<FileEntry>): void {
    this.fileEntries.update((entries) =>
      entries.map((e) => (e.id === id ? { ...e, ...partial } : e)),
    );
  }

  // -------------------------------------------------------------------------
  // Upload logic
  // -------------------------------------------------------------------------

  private startUpload(): void {
    const url = this.uploadUrl();
    if (!url || !this.http) return;

    const pending = this.fileEntries().filter((e) => e.status !== 'success');
    if (!pending.length) return;

    pending.forEach((e) =>
      this.updateEntry(e.id, { status: 'uploading', progress: 0 }),
    );
    this.uploadStarted.emit();
    this.statusAnnouncement.set('Upload started');

    switch (this.uploadStrategy()) {
      case 'batch':
        this.uploadBatch(pending, url);
        break;
      case 'parallel':
        pending.forEach((e) => this.uploadSingleFile(e, url));
        break;
      case 'sequential':
        this.uploadSequential(pending, url, 0);
        break;
    }
  }

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders(this.uploadHeaders());
  }

  private uploadBatch(entries: FileEntry[], url: string): void {
    if (!this.http) return;

    const formData = new FormData();
    entries.forEach((e) =>
      formData.append(this.uploadFieldName(), e.file, e.file.name),
    );

    const req = new HttpRequest('POST', url, formData, {
      headers: this.buildHeaders(),
      reportProgress: true,
      withCredentials: this.withCredentials(),
    });

    this.http
      .request(req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          if (
            event.type === HttpEventType.UploadProgress &&
            event.total != null
          ) {
            const progress = Math.round((event.loaded / event.total) * 100);
            entries.forEach((e) => this.updateEntry(e.id, { progress }));
            this.uploadProgress.emit(progress);
          } else if (event.type === HttpEventType.Response) {
            entries.forEach((e) =>
              this.updateEntry(e.id, { status: 'success', progress: 100 }),
            );
            this.uploadSuccess.emit(event.body);
            this.statusAnnouncement.set('Files uploaded successfully');
          }
        },
        error: (err: HttpErrorResponse) => {
          entries.forEach((e) =>
            this.updateEntry(e.id, { status: 'error', error: err.message }),
          );
          this.uploadError.emit(err);
          this.statusAnnouncement.set('Upload failed');
        },
      });
  }

  private uploadSingleFile(entry: FileEntry, url: string): void {
    if (!this.http) return;

    const formData = new FormData();
    formData.append(this.uploadFieldName(), entry.file, entry.file.name);

    const req = new HttpRequest('POST', url, formData, {
      headers: this.buildHeaders(),
      reportProgress: true,
      withCredentials: this.withCredentials(),
    });

    this.http
      .request(req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          if (
            event.type === HttpEventType.UploadProgress &&
            event.total != null
          ) {
            const progress = Math.round((event.loaded / event.total) * 100);
            this.updateEntry(entry.id, { progress });
            this.uploadProgress.emit(this.overallProgress());
          } else if (event.type === HttpEventType.Response) {
            this.updateEntry(entry.id, { status: 'success', progress: 100 });
            this.uploadSuccess.emit(event.body);
            this.statusAnnouncement.set(
              `${entry.file.name} uploaded successfully`,
            );
          }
        },
        error: (err: HttpErrorResponse) => {
          this.updateEntry(entry.id, { status: 'error', error: err.message });
          this.uploadError.emit(err);
          this.statusAnnouncement.set(`Failed to upload ${entry.file.name}`);
        },
      });
  }

  private uploadSequential(
    entries: FileEntry[],
    url: string,
    index: number,
  ): void {
    if (index >= entries.length || !this.http) return;
    const entry = entries[index];

    const formData = new FormData();
    formData.append(this.uploadFieldName(), entry.file, entry.file.name);

    const req = new HttpRequest('POST', url, formData, {
      headers: this.buildHeaders(),
      reportProgress: true,
      withCredentials: this.withCredentials(),
    });

    this.http
      .request(req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          if (
            event.type === HttpEventType.UploadProgress &&
            event.total != null
          ) {
            const progress = Math.round((event.loaded / event.total) * 100);
            this.updateEntry(entry.id, { progress });
            this.uploadProgress.emit(this.overallProgress());
          } else if (event.type === HttpEventType.Response) {
            this.updateEntry(entry.id, { status: 'success', progress: 100 });
            this.uploadSuccess.emit(event.body);
            this.statusAnnouncement.set(
              `${entry.file.name} uploaded successfully`,
            );
            this.uploadSequential(entries, url, index + 1);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.updateEntry(entry.id, { status: 'error', error: err.message });
          this.uploadError.emit(err);
          this.statusAnnouncement.set(`Failed to upload ${entry.file.name}`);
          // Continue with next file despite the error
          this.uploadSequential(entries, url, index + 1);
        },
      });
  }
}
