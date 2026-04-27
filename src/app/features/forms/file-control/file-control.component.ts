import { FocusMonitor } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ElementRef, HostBinding, Input, OnDestroy, Optional, Self, ViewChild, computed, signal } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldControl } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-file-control',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  providers: [{ provide: MatFormFieldControl, useExisting: FileFormControlComponent }],
  template: `
    <div
      class="flex items-center gap-2 w-full cursor-pointer min-h-[1.5rem] outline-none"
      (click)="onContainerClick($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      [class.opacity-50]="disabled"
      tabindex="0"
    >
      <input
        #fileInput
        type="file"
        class="hidden"
        [multiple]="multiple"
        [accept]="accept"
        [disabled]="disabled"
        (change)="onFileChange($event)"
      >

      <div class="flex-1 truncate text-sm font-normal">
        @if (empty) {
          <span class="text-gray-400 italic">{{ placeholder }}</span>
        } @else {
          <span class="text-gray-900 font-medium">{{ displayText() }}</span>
        }
      </div>

      @if (!empty && !disabled) {
        <button mat-icon-button type="button" (click)="clearFiles($event)" class="scale-75 text-gray-500 hover:text-red-500">
          <mat-icon>close</mat-icon>
        </button>
      } @else {
        <mat-icon class="text-gray-400 scale-90">attach_file</mat-icon>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    :host.floating {
      /* Classes appliquées quand le label Material doit flotter */
    }
  `]
})
export class FileFormControlComponent implements ControlValueAccessor, MatFormFieldControl<File | File[] | null>, OnDestroy {
  static nextId = 0;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @HostBinding() id = `app-file-control-${FileFormControlComponent.nextId++}`;

  stateChanges = new Subject<void>();

  // --- Signaux internes pour la réactivité ---
  private _value = signal<File | File[] | null>(null);
  private _focused = signal(false);
  private _touched = signal(false);
  private _disabled = signal(false);
  private _required = signal(false);

  // --- Getters MatFormFieldControl (Doivent retourner des primitives) ---
  get value(): File | File[] | null { return this._value(); }
  get focused(): boolean { return this._focused(); }
  get disabled(): boolean { return this._disabled(); }
  get required(): boolean { return this._required(); }
  get empty(): boolean {
    const val = this._value();
    return Array.isArray(val) ? val.length === 0 : val === null;
  }

  @HostBinding('class.floating')
  get shouldLabelFloat(): boolean { return this.focused || !this.empty; }

  // État d'erreur synchronisé avec le FormControl parent
  get errorState(): boolean {
    const isInvalid = this.ngControl?.invalid ?? false;
    const isTouched = this.ngControl?.touched ?? this._touched();
    return isInvalid && isTouched;
  }

  controlType = 'app-file-control';
  @HostBinding('attr.aria-describedby') describedBy = '';

  // --- Inputs ---
  @Input() placeholder: string = 'Sélectionnez un fichier...';
  @Input() multiple = true;
  @Input() accept = '*';

  @Input()
  set required(req: any) {
    this._required.set(coerceBooleanProperty(req));
    this.stateChanges.next();
  }

  // --- Callbacks ControlValueAccessor ---
  private _onChange = (_: any) => {};
  private _onTouchedCallback = () => {};

  // Texte affiché dynamiquement
  displayText = computed(() => {
    const val = this._value();
    if (!val) return '';
    if (Array.isArray(val)) return `${val.length} fichier(s) sélectionné(s)`;
    return val.name;
  });

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private fm: FocusMonitor,
    private elRef: ElementRef<HTMLElement>
  ) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    // Gère le focus natif pour l'accessibilité Material
    this.fm.monitor(elRef.nativeElement, true).subscribe(origin => {
      this._focused.set(!!origin);
      this.stateChanges.next();
    });
  }

  // --- Logique métier et DOM ---
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    if (files.length === 0) return;

    const newValue = this.multiple ? files : files[0];
    this.updateValue(newValue);
  }

  clearFiles(event: MouseEvent) {
    event.stopPropagation(); // Évite de rouvrir le sélecteur de fichiers
    this.updateValue(null);
    if (this.fileInput) {
      this.fileInput.nativeElement.value = ''; // Réinitialise l'input natif
    }
  }

  private updateValue(val: File | File[] | null) {
    this._value.set(val);
    this._onChange(val);
    this.markAsTouched();
  }

  private markAsTouched() {
    if (!this._touched()) {
      this._touched.set(true);
      this._onTouchedCallback();
      this.stateChanges.next();
    }
  }

  // --- Drag & Drop ---
  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.disabled) this._focused.set(true);
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this._focused.set(false);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this._focused.set(false);

    if (this.disabled) return;

    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) {
      this.updateValue(this.multiple ? files : files[0]);
    }
  }

  // --- Implémentation ControlValueAccessor ---
  writeValue(value: File | File[] | null): void {
    this._value.set(value);

    // Si le formulaire est reset (value null), on nettoie l'input natif
    if (!value && this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.stateChanges.next();
  }

  registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: any): void {
    // On assigne le callback à une variable séparée pour ne pas écraser notre propre logique
    this._onTouchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
    this.stateChanges.next();
  }

  // --- Implémentation MatFormFieldControl ---
  setDescribedByIds(ids: string[]): void {
    this.describedBy = ids.join(' ');
  }

  onContainerClick(event: MouseEvent): void {
    if (this.disabled) return;

    // Ne pas déclencher le clic si on clique sur un bouton (ex: bouton supprimer)
    const target = event.target as HTMLElement;
    if (target.tagName.toLowerCase() !== 'button' && target.closest('button') === null) {
      this.fileInput.nativeElement.click();
      this.markAsTouched();
    }
  }

  ngOnDestroy(): void {
    this.stateChanges.complete();
    this.fm.stopMonitoring(this.elRef.nativeElement);
  }
}
