import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
    FileDropzoneComponent,
    formatFileSize,
} from './file-dropzone.component';

describe('FileDropzoneComponent', () => {
  let component: FileDropzoneComponent;
  let fixture: ComponentFixture<FileDropzoneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileDropzoneComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(FileDropzoneComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // formatFileSize helper
  // -------------------------------------------------------------------------

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024)).toBe('1.0 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB');
    });
  });

  // -------------------------------------------------------------------------
  // ControlValueAccessor
  // -------------------------------------------------------------------------

  describe('ControlValueAccessor', () => {
    it('sets files via writeValue', () => {
      const file = new File(['content'], 'hello.txt', { type: 'text/plain' });
      component.writeValue([file]);
      fixture.detectChanges();

      expect(component['fileEntries']().length).toBe(1);
      expect(component['fileEntries']()[0].file.name).toBe('hello.txt');
    });

    it('clears entries when writeValue receives null', () => {
      component.writeValue([new File(['x'], 'a.txt')]);
      component.writeValue(null);
      expect(component['fileEntries']().length).toBe(0);
    });

    it('clears entries when writeValue receives empty array', () => {
      component.writeValue([new File(['x'], 'a.txt')]);
      component.writeValue([]);
      expect(component['fileEntries']().length).toBe(0);
    });

    it('calls onChange callback when files change via handleFiles', () => {
      let emitted: File[] | undefined;
      component.registerOnChange((files) => (emitted = files));

      const file = new File(['x'], 'test.txt');
      (component as unknown as { handleFiles(f: File[]): void }).handleFiles([
        file,
      ]);

      expect(emitted).toBeDefined();
      expect(emitted![0].name).toBe('test.txt');
    });

    it('updates CVA disabled state via setDisabledState', () => {
      component.setDisabledState(true);
      expect(component['effectiveDisabled']()).toBe(true);

      component.setDisabledState(false);
      expect(component['effectiveDisabled']()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Disabled state
  // -------------------------------------------------------------------------

  describe('disabled', () => {
    it('respects the disabled input', () => {
      fixture.componentRef.setInput('disabled', true);
      expect(component['effectiveDisabled']()).toBe(true);
    });

    it('is disabled when either disabled input or CVA disabled is true', () => {
      fixture.componentRef.setInput('disabled', false);
      component.setDisabledState(true);
      expect(component['effectiveDisabled']()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Single vs multi-file mode
  // -------------------------------------------------------------------------

  describe('isSingleMode', () => {
    it('is true when maxFiles is 1 (default)', () => {
      expect(component['isSingleMode']()).toBe(true);
    });

    it('is false when maxFiles > 1', () => {
      fixture.componentRef.setInput('maxFiles', 3);
      expect(component['isSingleMode']()).toBe(false);
    });
  });

  describe('single-file mode', () => {
    it('replaces the existing file', () => {
      const file1 = new File(['a'], 'first.txt');
      const file2 = new File(['b'], 'second.txt');

      component.writeValue([file1]);
      (component as unknown as { handleFiles(f: File[]): void }).handleFiles([
        file2,
      ]);

      const entries = component['fileEntries']();
      expect(entries.length).toBe(1);
      expect(entries[0].file.name).toBe('second.txt');
    });
  });

  describe('multi-file mode', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('maxFiles', 3);
    });

    it('appends files up to maxFiles', () => {
      const f1 = new File(['a'], 'a.txt');
      const f2 = new File(['b'], 'b.txt');
      const f3 = new File(['c'], 'c.txt');
      const f4 = new File(['d'], 'd.txt');

      (
        component as unknown as { handleFiles(f: File[]): void }
      ).handleFiles([f1, f2, f3, f4]);

      expect(component['fileEntries']().length).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  describe('validation', () => {
    it('emits validationError for oversized files', () => {
      let errors: { file: File; errors: string[] }[] = [];
      component.validationError.subscribe((e) => (errors = e));

      fixture.componentRef.setInput('maxFileSizeBytes', 10);
      const bigFile = new File(['x'.repeat(100)], 'big.txt', {
        type: 'text/plain',
      });
      (component as unknown as { handleFiles(f: File[]): void }).handleFiles([
        bigFile,
      ]);

      expect(errors.length).toBe(1);
      expect(errors[0].errors[0]).toContain('exceeds maximum size');
    });

    it('emits validationError for rejected MIME types', () => {
      let errors: { file: File; errors: string[] }[] = [];
      component.validationError.subscribe((e) => (errors = e));

      fixture.componentRef.setInput('acceptedTypes', ['image/png']);
      const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
      (component as unknown as { handleFiles(f: File[]): void }).handleFiles([
        file,
      ]);

      expect(errors.length).toBe(1);
      expect(errors[0].errors).toContain('File type not accepted');
    });

    it('accepts files matching a dot-extension', () => {
      let changed: File[] | undefined;
      component.filesChanged.subscribe((files) => (changed = files));

      fixture.componentRef.setInput('acceptedTypes', ['.txt']);
      const file = new File(['data'], 'readme.txt', { type: 'text/plain' });
      (component as unknown as { handleFiles(f: File[]): void }).handleFiles([
        file,
      ]);

      expect(changed).toBeDefined();
      expect(changed!.length).toBe(1);
    });

    it('emits validationError when maxFiles is exceeded in multi mode', () => {
      fixture.componentRef.setInput('maxFiles', 2);
      let errors: { file: File; errors: string[] }[] = [];
      component.validationError.subscribe((e) => (errors = e));

      // Fill up the quota first
      component.writeValue([
        new File(['a'], 'a.txt'),
        new File(['b'], 'b.txt'),
      ]);

      const extra = new File(['c'], 'c.txt');
      (component as unknown as { handleFiles(f: File[]): void }).handleFiles([
        extra,
      ]);

      expect(errors.length).toBe(1);
      expect(errors[0].errors[0]).toContain('Maximum number of files reached');
    });
  });

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  describe('reset()', () => {
    it('clears all files', () => {
      component.writeValue([new File(['x'], 'test.txt')]);
      expect(component['fileEntries']().length).toBe(1);

      component.reset();
      expect(component['fileEntries']().length).toBe(0);
    });

    it('emits filesChanged with empty array', () => {
      let emitted: File[] | undefined;
      component.filesChanged.subscribe((files) => (emitted = files));

      component.writeValue([new File(['x'], 'test.txt')]);
      component.reset();

      expect(emitted).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Progress bar visibility
  // -------------------------------------------------------------------------

  describe('effectiveShowProgressBar', () => {
    it('is false by default when uploadUrl is not set', () => {
      expect(component['effectiveShowProgressBar']()).toBe(false);
    });

    it('is true when uploadUrl is set and showProgressBar is null', () => {
      fixture.componentRef.setInput('uploadUrl', 'https://example.com/upload');
      expect(component['effectiveShowProgressBar']()).toBe(true);
    });

    it('respects explicit showProgressBar input', () => {
      fixture.componentRef.setInput('uploadUrl', 'https://example.com/upload');
      fixture.componentRef.setInput('showProgressBar', false);
      expect(component['effectiveShowProgressBar']()).toBe(false);
    });
  });
});
