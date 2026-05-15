/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

import {
  LucideFile,
  LucideFileArchive,
  LucideFileBraces,
  LucideFileCode,
  LucideFileImage,
  LucideFileMusic,
  LucideFileSpreadsheet,
  LucideFileType,
  LucideFileVideoCamera,
} from '@lucide/angular';

import {
  BYTES_PER_KB,
  BYTES_PER_MB,
  FileUploadInputComponent,
} from './file-upload-input.component';

const mkFile = (name: string, size = 1024, type = 'application/octet-stream'): File =>
  new File(['x'.repeat(size)], name, { type });

const pdfFile = (name = 'doc.pdf', size = 1024): File =>
  new File(['x'.repeat(size)], name, { type: 'application/pdf' });

function createFixture(
  inputs: Record<string, unknown> = {}
): ComponentFixture<FileUploadInputComponent> {
  const fixture = TestBed.createComponent(FileUploadInputComponent);
  fixture.componentRef.setInput('label', 'Upload');
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

@Component({
  imports: [FileUploadInputComponent, ReactiveFormsModule],
  template: `<app-file-upload-input [formControl]="control" [label]="'Upload'" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CvaHostComponent {
  control = new FormControl<File[]>([]);
}

describe('FileUploadInputComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FileUploadInputComponent, CvaHostComponent],
    });
  });

  // ─── ControlValueAccessor ─────────────────────────────────────────

  describe('ControlValueAccessor', () => {
    let fixture: ComponentFixture<CvaHostComponent>;
    let host: CvaHostComponent;
    let component: FileUploadInputComponent;

    beforeEach(() => {
      fixture = TestBed.createComponent(CvaHostComponent);
      fixture.detectChanges();
      component = fixture.debugElement.query(
        By.directive(FileUploadInputComponent)
      ).componentInstance;
      host = fixture.componentInstance;
    });

    it('should set files via writeValue', () => {
      const files = [pdfFile()];
      host.control.setValue(files);
      fixture.detectChanges();
      expect(component['files']()).toEqual(files);
    });

    it('should handle null writeValue', () => {
      host.control.setValue(null);
      fixture.detectChanges();
      expect(component['files']()).toEqual([]);
    });

    it('should propagate changes to the form control', () => {
      component.onFileInputChange(inputEvent([pdfFile()]));
      expect(host.control.value).toEqual([pdfFile()]);
    });

    it('should set disabled state', () => {
      host.control.disable();
      fixture.detectChanges();
      expect(component['isDisabled']()).toBe(true);
    });

    it('should re-enable', () => {
      host.control.disable();
      fixture.detectChanges();
      host.control.enable();
      fixture.detectChanges();
      expect(component['isDisabled']()).toBe(false);
    });

    it('should notify form control on cancelAll', () => {
      component.onFileInputChange(inputEvent([pdfFile()]));
      component.cancelAll();
      expect(host.control.value).toEqual([]);
    });
  });

  // ─── File Validation ──────────────────────────────────────────────

  describe('file validation', () => {
    describe('MIME type filtering', () => {
      it('should accept any file when accept is */*', () => {
        const { componentInstance: c } = createFixture();
        c.onFileInputChange(inputEvent([pdfFile()]));
        expect(c['files']().length).toBe(1);
        expect(c['uploadErrors']().length).toBe(0);
      });

      it('should reject files not matching exact MIME type', () => {
        const { componentInstance: c } = createFixture({ accept: 'application/pdf' });
        c.onFileInputChange(inputEvent([mkFile('image.png', 100, 'image/png')]));
        expect(c['files']().length).toBe(0);
        expect(c['uploadErrors']().length).toBe(1);
        expect(c['uploadErrors']()[0].type).toBe('fileTypeNotAllowed');
      });

      it('should accept files matching wildcard MIME (image/*)', () => {
        const { componentInstance: c } = createFixture({ accept: 'image/*' });
        c.onFileInputChange(inputEvent([mkFile('photo.jpg', 100, 'image/jpeg')]));
        expect(c['files']().length).toBe(1);
      });

      it('should accept files matching extension (.pdf)', () => {
        const { componentInstance: c } = createFixture({ accept: '.pdf' });
        c.onFileInputChange(inputEvent([mkFile('doc.pdf', 100, 'application/pdf')]));
        expect(c['files']().length).toBe(1);
      });

      it('should handle multiple accept types', () => {
        const { componentInstance: c } = createFixture({ accept: '.pdf, image/*' });
        c.onFileInputChange(inputEvent([mkFile('photo.jpg', 100, 'image/jpeg')]));
        expect(c['files']().length).toBe(1);
      });
    });

    describe('max file size', () => {
      it('should reject files exceeding maxSizeMb', () => {
        const { componentInstance: c } = createFixture({ maxSizeMb: 1 });
        c.onFileInputChange(inputEvent([mkFile('big.bin', 2 * BYTES_PER_MB)]));
        expect(c['files']().length).toBe(0);
        expect(c['uploadErrors']()[0].type).toBe('fileTooLarge');
      });

      it('should accept files within maxSizeMb', () => {
        const { componentInstance: c } = createFixture({ maxSizeMb: 5 });
        c.onFileInputChange(inputEvent([mkFile('small.bin', 1 * BYTES_PER_MB)]));
        expect(c['files']().length).toBe(1);
      });

      it('should not validate size when maxSizeMb is not set', () => {
        const { componentInstance: c } = createFixture();
        c.onFileInputChange(inputEvent([mkFile('big.bin', 100 * BYTES_PER_MB)]));
        expect(c['files']().length).toBe(1);
      });
    });

    describe('max files', () => {
      it('should reject files beyond maxFiles limit', () => {
        const { componentInstance: c } = createFixture({ maxFiles: 2 });
        c.onFileInputChange(
          inputEvent([mkFile('a.txt', 10), mkFile('b.txt', 20), mkFile('c.txt', 30)])
        );
        expect(c['files']().length).toBe(2);
        expect(c['uploadErrors']().some((e) => e.type === 'maxFilesReached')).toBe(true);
      });
    });

    describe('duplicate files', () => {
      it('should reject files with same name and size', () => {
        const { componentInstance: c } = createFixture({ maxFiles: 5 });
        c.onFileInputChange(inputEvent([mkFile('same.txt', 100)]));
        c.onFileInputChange(inputEvent([mkFile('same.txt', 100)]));
        expect(c['files']().length).toBe(1);
        expect(c['uploadErrors']()[0].type).toBe('duplicateFile');
      });

      it('should allow files with same name but different size', () => {
        const { componentInstance: c } = createFixture({ maxFiles: 5 });
        c.onFileInputChange(inputEvent([mkFile('doc.txt', 100)]));
        c.onFileInputChange(inputEvent([mkFile('doc.txt', 200)]));
        expect(c['files']().length).toBe(2);
      });
    });

    describe('single file mode', () => {
      it('should not replace existing file when adding in single-file mode', () => {
        const { componentInstance: c } = createFixture();
        c.onFileInputChange(inputEvent([mkFile('first.txt', 10)]));
        c.onFileInputChange(inputEvent([mkFile('second.txt', 20)]));
        expect(c['files']().length).toBe(1);
        expect(c['files']()[0].name).toBe('first.txt');
      });

      it('should take only the first file from a multi-selection', () => {
        const { componentInstance: c } = createFixture();
        c.onFileInputChange(inputEvent([mkFile('a.txt', 10), mkFile('b.txt', 20)]));
        expect(c['files']().length).toBe(1);
        expect(c['files']()[0].name).toBe('a.txt');
      });
    });

    describe('multi file mode', () => {
      it('should append files in multi-file mode', () => {
        const { componentInstance: c } = createFixture({ maxFiles: 5 });
        c.onFileInputChange(inputEvent([mkFile('a.txt', 10)]));
        c.onFileInputChange(inputEvent([mkFile('b.txt', 20)]));
        expect(c['files']().length).toBe(2);
      });
    });
  });

  // ─── Validator ────────────────────────────────────────────────────

  describe('Validator', () => {
    it('should return null when no errors', () => {
      const { componentInstance: c } = createFixture();
      expect(c.validate()).toBeNull();
    });

    it('should expose upload errors as validation errors', () => {
      const { componentInstance: c } = createFixture({ accept: 'application/pdf' });
      c.onFileInputChange(inputEvent([mkFile('bad.txt', 10, 'text/plain')]));
      const errors = c.validate();
      expect(errors).not.toBeNull();
      expect(errors!['fileTypeNotAllowed']).toBe(true);
    });

    it('should set notSubmitted error when showSubmitButton is true and files are pending', () => {
      const { componentInstance: c } = createFixture({ showSubmitButton: true });
      c.onFileInputChange(inputEvent([pdfFile()]));
      TestBed.tick();
      const errors = c.validate();
      expect(errors).not.toBeNull();
      expect(errors!['notSubmitted']).toBe(true);
    });

    it('should clear notSubmitted after upload()', () => {
      const { componentInstance: c } = createFixture({ showSubmitButton: true });
      c.onFileInputChange(inputEvent([pdfFile()]));
      TestBed.tick();
      c.upload();
      expect(c.validate()?.['notSubmitted']).toBeUndefined();
    });
  });

  // ─── Drag & Drop ─────────────────────────────────────────────────

  describe('drag & drop', () => {
    it('should set isDragging on dragover', () => {
      const { componentInstance: c } = createFixture({ dragDropEnabled: true });
      const event = dragEvent('dragover');
      c.onDragOver(event);
      expect(c['isDragging']()).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should clear isDragging on dragleave', () => {
      const { componentInstance: c } = createFixture({ dragDropEnabled: true });
      c.onDragOver(dragEvent('dragover'));
      c.onDragLeave(dragEvent('dragleave'));
      expect(c['isDragging']()).toBe(false);
    });

    it('should add files on drop', () => {
      const { componentInstance: c } = createFixture({ dragDropEnabled: true });
      c.onDrop(dragEvent('drop', [pdfFile()]));
      expect(c['files']().length).toBe(1);
      expect(c['isDragging']()).toBe(false);
    });

    it('should ignore dragover when disabled', () => {
      const { componentInstance: c } = createFixture({ dragDropEnabled: true });
      c['isDisabled'].set(true);
      const event = dragEvent('dragover');
      c.onDragOver(event);
      expect(c['isDragging']()).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should ignore drop when disabled', () => {
      const { componentInstance: c } = createFixture({ dragDropEnabled: true });
      c['isDisabled'].set(true);
      c.onDrop(dragEvent('drop', [pdfFile()]));
      expect(c['files']().length).toBe(0);
    });

    it('should ignore dragover when loading', () => {
      const { componentInstance: c } = createFixture({ dragDropEnabled: true, loading: true });
      const event = dragEvent('dragover');
      c.onDragOver(event);
      expect(c['isDragging']()).toBe(false);
    });

    it('should ignore drop when loading', () => {
      const { componentInstance: c } = createFixture({ dragDropEnabled: true, loading: true });
      c.onDrop(dragEvent('drop', [pdfFile()]));
      expect(c['files']().length).toBe(0);
    });

    it('should ignore dragover when dragDrop is not enabled', () => {
      const { componentInstance: c } = createFixture();
      const event = dragEvent('dragover');
      c.onDragOver(event);
      expect(c['isDragging']()).toBe(false);
    });
  });

  // ─── Upload / Submit ──────────────────────────────────────────────

  describe('upload', () => {
    it('should emit uploadTriggered when showSubmitButton is true', () => {
      const { componentInstance: c } = createFixture({ showSubmitButton: true });
      const emitSpy = vi.fn();
      c.uploadTriggered.subscribe(emitSpy);
      c.onFileInputChange(inputEvent([pdfFile()]));
      c.upload();
      expect(emitSpy).toHaveBeenCalledWith(c['files']());
    });

    it('should not emit uploadTriggered when showSubmitButton is false', () => {
      const { componentInstance: c } = createFixture();
      const emitSpy = vi.fn();
      c.uploadTriggered.subscribe(emitSpy);
      c.onFileInputChange(inputEvent([pdfFile()]));
      c.upload();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should not emit when loading', () => {
      const { componentInstance: c } = createFixture({ showSubmitButton: true, loading: true });
      const emitSpy = vi.fn();
      c.uploadTriggered.subscribe(emitSpy);
      c.onFileInputChange(inputEvent([pdfFile()]));
      c.upload();
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  // ─── Cancel / Remove ──────────────────────────────────────────────

  describe('cancelAll', () => {
    it('should clear all files and errors', () => {
      const { componentInstance: c } = createFixture({ maxFiles: 2, accept: 'application/pdf' });
      c.onFileInputChange(inputEvent([pdfFile(), mkFile('bad.txt', 10, 'text/plain')]));
      c.cancelAll();
      expect(c['files']().length).toBe(0);
      expect(c['uploadErrors']().length).toBe(0);
    });
  });

  describe('removeFile', () => {
    it('should remove file at given index', () => {
      const { componentInstance: c } = createFixture({ maxFiles: 3 });
      c.onFileInputChange(
        inputEvent([mkFile('a.txt', 10), mkFile('b.txt', 20), mkFile('c.txt', 30)])
      );
      c.removeFile(1);
      expect(c['files']().length).toBe(2);
      expect(c['files']().map((f) => f.name)).toEqual(['a.txt', 'c.txt']);
    });

    it('should call cancelAll when removing the last file', () => {
      const { componentInstance: c } = createFixture();
      c.onFileInputChange(inputEvent([pdfFile()]));
      const cancelSpy = vi.spyOn(c, 'cancelAll');
      c.removeFile(0);
      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should clear maxFilesReached errors on removal', () => {
      const { componentInstance: c } = createFixture({ maxFiles: 2 });
      c.onFileInputChange(
        inputEvent([mkFile('a.txt', 10), mkFile('b.txt', 20), mkFile('c.txt', 30)])
      );
      expect(c['uploadErrors']().some((e) => e.type === 'maxFilesReached')).toBe(true);
      c.removeFile(0);
      expect(c['uploadErrors']().some((e) => e.type === 'maxFilesReached')).toBe(false);
    });
  });

  // ─── openFilePicker ───────────────────────────────────────────────

  describe('openFilePicker', () => {
    it('should not open when disabled', () => {
      const { componentInstance: c } = createFixture();
      c['isDisabled'].set(true);
      const clickSpy = vi.fn();
      c['fileInputRef']().nativeElement.click = clickSpy;
      c.openFilePicker(new PointerEvent('click'));
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('should not open when loading', () => {
      const { componentInstance: c } = createFixture({ loading: true });
      const clickSpy = vi.fn();
      c['fileInputRef']().nativeElement.click = clickSpy;
      c.openFilePicker(new PointerEvent('click'));
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('should open on PointerEvent', () => {
      const { componentInstance: c } = createFixture();
      const clickSpy = vi.fn();
      c['fileInputRef']().nativeElement.click = clickSpy;
      c.openFilePicker(new PointerEvent('click'));
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should open on Enter key', () => {
      const { componentInstance: c } = createFixture();
      const clickSpy = vi.fn();
      c['fileInputRef']().nativeElement.click = clickSpy;
      c.openFilePicker(new KeyboardEvent('keydown', { code: 'Enter' }));
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should open on Space key', () => {
      const { componentInstance: c } = createFixture();
      const clickSpy = vi.fn();
      c['fileInputRef']().nativeElement.click = clickSpy;
      c.openFilePicker(new KeyboardEvent('keydown', { code: 'Space' }));
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should not open on other keys', () => {
      const { componentInstance: c } = createFixture();
      const clickSpy = vi.fn();
      c['fileInputRef']().nativeElement.click = clickSpy;
      c.openFilePicker(new KeyboardEvent('keydown', { code: 'Tab' }));
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  // ─── formatSize ───────────────────────────────────────────────────

  describe('formatSize', () => {
    let c: FileUploadInputComponent;

    beforeEach(() => {
      c = createFixture().componentInstance;
    });

    it('should format bytes', () => {
      expect(c.formatSize(500)).toBe('500 o');
    });

    it('should format kilobytes', () => {
      expect(c.formatSize(1536)).toBe('1.5 Ko');
    });

    it('should format megabytes', () => {
      expect(c.formatSize(2.5 * BYTES_PER_MB)).toBe('2.5 Mo');
    });

    it('should format exactly 1 KB', () => {
      expect(c.formatSize(BYTES_PER_KB)).toBe('1.0 Ko');
    });
  });

  // ─── getFileIcon ──────────────────────────────────────────────────

  describe('getFileIcon', () => {
    let c: FileUploadInputComponent;

    beforeEach(() => {
      c = createFixture().componentInstance;
    });

    it('should return image icon for image/*', () => {
      expect(c.getFileIcon(mkFile('photo.jpg', 1, 'image/jpeg'))).toBe(LucideFileImage);
    });

    it('should return video icon for video/*', () => {
      expect(c.getFileIcon(mkFile('clip.mp4', 1, 'video/mp4'))).toBe(LucideFileVideoCamera);
    });

    it('should return audio icon for audio/*', () => {
      expect(c.getFileIcon(mkFile('song.mp3', 1, 'audio/mpeg'))).toBe(LucideFileMusic);
    });

    it('should return PDF icon for application/pdf', () => {
      expect(c.getFileIcon(mkFile('doc.pdf', 1, 'application/pdf'))).toBe(LucideFile);
    });

    it('should return spreadsheet icon for .xlsx', () => {
      expect(c.getFileIcon(mkFile('data.xlsx', 1, 'application/octet-stream'))).toBe(
        LucideFileSpreadsheet
      );
    });

    it('should return spreadsheet icon for .csv', () => {
      expect(c.getFileIcon(mkFile('data.csv', 1, 'text/csv'))).toBe(LucideFileSpreadsheet);
    });

    it('should return word icon for .docx', () => {
      expect(c.getFileIcon(mkFile('doc.docx', 1, 'application/octet-stream'))).toBe(LucideFileType);
    });

    it('should return code icon for .ts', () => {
      expect(c.getFileIcon(mkFile('app.ts', 1, 'application/octet-stream'))).toBe(LucideFileCode);
    });

    it('should return code icon for text/html', () => {
      expect(c.getFileIcon(mkFile('index.html', 1, 'text/html'))).toBe(LucideFileCode);
    });

    it('should return JSON icon for .json', () => {
      expect(c.getFileIcon(mkFile('config.json', 1, 'application/json'))).toBe(LucideFileBraces);
    });

    it('should return archive icon for .zip', () => {
      expect(c.getFileIcon(mkFile('archive.zip', 1, 'application/zip'))).toBe(LucideFileArchive);
    });

    it('should return archive icon for .tar.gz', () => {
      expect(c.getFileIcon(mkFile('archive.tar.gz', 1, 'application/gzip'))).toBe(
        LucideFileArchive
      );
    });

    it('should return generic file icon for unknown types', () => {
      expect(c.getFileIcon(mkFile('mystery.xyz', 1, 'application/octet-stream'))).toBe(LucideFile);
    });
  });

  // ─── Computed Signals ─────────────────────────────────────────────

  describe('computed signals', () => {
    it('should compute multiple as true when maxFiles > 1', () => {
      const { componentInstance: c } = createFixture({ maxFiles: 3 });
      expect(c['multiple']()).toBe(true);
    });

    it('should compute multiple as false when maxFiles is 1', () => {
      const { componentInstance: c } = createFixture();
      expect(c['multiple']()).toBe(false);
    });

    it('should compute acceptedTypesTooltipLabel for single type', () => {
      const { componentInstance: c } = createFixture({ accept: 'application/pdf' });
      expect(c['acceptedTypesTooltipLabel']()).toBe('Type accept\u00e9 : application/pdf');
    });

    it('should compute acceptedTypesTooltipLabel for multiple types', () => {
      const { componentInstance: c } = createFixture({ accept: 'application/pdf, image/*' });
      expect(c['acceptedTypesTooltipLabel']()).toBe(
        'Types accept\u00e9s : application/pdf, image/*'
      );
    });

    it('should return undefined for acceptedTypesTooltipLabel when accept is */*', () => {
      const { componentInstance: c } = createFixture();
      expect(c['acceptedTypesTooltipLabel']()).toBeUndefined();
    });

    it('should compute submitButtonTooltipLabel for no files', () => {
      const { componentInstance: c } = createFixture({ showSubmitButton: true });
      expect(c['submitButtonTooltilpLabel']()).toBe('Aucun fichier s\u00e9lectionn\u00e9');
    });

    it('should compute submitButtonTooltipLabel for loading state', () => {
      const { componentInstance: c } = createFixture({ showSubmitButton: true, loading: true });
      c.onFileInputChange(inputEvent([pdfFile()]));
      expect(c['submitButtonTooltilpLabel']()).toBe('Envoi en cours...');
    });

    it('should compute submitButtonTooltipLabel with custom loading label', () => {
      const { componentInstance: c } = createFixture({
        showSubmitButton: true,
        loading: true,
        loadingLabel: 'Traitement...',
      });
      c.onFileInputChange(inputEvent([pdfFile()]));
      expect(c['submitButtonTooltilpLabel']()).toBe('Traitement...');
    });

    it('should compute submitButtonTooltipLabel with file count', () => {
      const { componentInstance: c } = createFixture({ showSubmitButton: true });
      c.onFileInputChange(inputEvent([pdfFile()]));
      expect(c['submitButtonTooltilpLabel']()).toBe('Envoyer 1 fichier');
    });

    it('should pluralize submitButtonTooltipLabel for multiple files', () => {
      const { componentInstance: c } = createFixture({ showSubmitButton: true, maxFiles: 3 });
      c.onFileInputChange(inputEvent([mkFile('a.txt', 10), mkFile('b.txt', 20)]));
      expect(c['submitButtonTooltilpLabel']()).toBe('Envoyer 2 fichiers');
    });

    it('should compute informationsTooltipLabel with additional info', () => {
      const { componentInstance: c } = createFixture({
        additionalInformations: 'Format UTF-8 requis',
      });
      expect(c['informationsTooltipLabel']()).toBe('Format UTF-8 requis');
    });

    it('should compute informationsTooltipLabel with maxSizeMb', () => {
      const { componentInstance: c } = createFixture({ maxSizeMb: 10 });
      expect(c['informationsTooltipLabel']()).toBe('Taille maximum par fichier : 10Mo');
    });

    it('should combine additionalInformations and maxSizeMb', () => {
      const { componentInstance: c } = createFixture({
        additionalInformations: 'UTF-8',
        maxSizeMb: 5,
      });
      expect(c['informationsTooltipLabel']()).toBe('UTF-8 - Taille maximum par fichier : 5Mo');
    });
  });

  // ─── onFileInputChange ────────────────────────────────────────────

  describe('onFileInputChange', () => {
    it('should reset native input value after selection', () => {
      const { componentInstance: c } = createFixture();
      const inputEl = {
        files: [pdfFile()],
        value: 'C:\\file.pdf',
      } as unknown as HTMLInputElement;
      c.onFileInputChange({ target: inputEl } as unknown as Event);
      expect(inputEl.value).toBe('');
    });
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────

function inputEvent(files: File[]): Event {
  const input = { files, value: 'fakevalue' } as unknown as HTMLInputElement;
  return { target: input } as unknown as Event;
}

function dragEvent(type: string, files: File[] = []): DragEvent {
  return {
    type,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    dataTransfer: { files },
  } as unknown as DragEvent;
}
