/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable camelcase */
import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DialogService } from '@shared/services/dialog.service';

import { VariantsPage } from '../../models/pdf-masking.model';
import { PdfMasking } from '../pdf-masking/pdf-masking.abstract';

import { VariantsStoreService } from './variants-store.service';

const mockApiPage = (page: number, hasNext: boolean, total: number): VariantsPage => ({
  items: Array.from({ length: 2 }, (_, i) => `VARIANT_${(page - 1) * 2 + i + 1}`),
  page,
  page_size: 50,
  total_items: total,
  total_pages: Math.ceil(total / 50),
  has_next: hasNext,
  has_previous: page > 1,
});

describe('VariantsStoreService', () => {
  let store: VariantsStoreService;
  let pdfMaskingSpy: {
    getVariants: ReturnType<typeof vi.fn>;
    deleteVariants: ReturnType<typeof vi.fn>;
  };
  let dialogSpy: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    pdfMaskingSpy = {
      getVariants: vi.fn().mockReturnValue(of(mockApiPage(1, true, 100))),
      deleteVariants: vi.fn().mockReturnValue(of(void 0)),
    };

    dialogSpy = {
      confirm: vi.fn().mockReturnValue(of(true)),
    };

    TestBed.configureTestingModule({
      providers: [
        VariantsStoreService,
        DestroyRef,
        { provide: PdfMasking, useValue: pdfMaskingSpy },
        { provide: DialogService, useValue: dialogSpy },
      ],
    });

    store = TestBed.inject(VariantsStoreService);
    await Promise.resolve();
  });

  describe('initialization', () => {
    it('should load page 1 on construction', () => {
      expect(pdfMaskingSpy.getVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          page_size: 50,
          validated_only: true,
        })
      );
    });

    it('should populate items from first page', () => {
      expect(store.items()).toEqual(['VARIANT_1', 'VARIANT_2']);
      expect(store.hasNext()).toBe(true);
      expect(store.totalItems()).toBe(100);
    });

    it('should expose pageSize and totalPages', () => {
      expect(store.pageSize()).toBe(50);
      expect(store.totalPages()).toBe(2);
    });
  });

  describe('loadMore', () => {
    it('should fetch the next page', () => {
      pdfMaskingSpy.getVariants.mockReturnValueOnce(of(mockApiPage(2, false, 100)));
      store.loadMore();

      expect(pdfMaskingSpy.getVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          page_size: 50,
          validated_only: true,
        })
      );
      expect(store.items()).toHaveLength(4);
    });
  });

  describe('deleteAll', () => {
    it('should open a confirmation dialog', () => {
      store.deleteAll();

      expect(dialogSpy.confirm).toHaveBeenCalledWith({
        title: 'Supprimer tous les variants',
        message: 'Cette action est irréversible.',
        confirmLabel: 'Supprimer',
      });
    });

    it('should call deleteVariants and reset on confirm', () => {
      pdfMaskingSpy.getVariants.mockReturnValue(of(mockApiPage(1, false, 0)));

      store.deleteAll();

      expect(pdfMaskingSpy.deleteVariants).toHaveBeenCalled();
      expect(store.isDeleting()).toBe(false);
    });

    it('should not delete when dialog is cancelled', () => {
      dialogSpy.confirm.mockReturnValue(of(false));

      store.deleteAll();

      expect(pdfMaskingSpy.deleteVariants).not.toHaveBeenCalled();
    });

    it('should set isDeleting during deletion', () => {
      let deletingDuringCall = false;
      pdfMaskingSpy.deleteVariants.mockImplementation(() => {
        deletingDuringCall = store.isDeleting();
        return of(void 0);
      });

      store.deleteAll();

      expect(deletingDuringCall).toBe(true);
      expect(store.isDeleting()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear items and reload', () => {
      pdfMaskingSpy.getVariants.mockReturnValue(of(mockApiPage(1, false, 2)));

      store.reset();

      expect(store.items()).toHaveLength(2);
    });
  });
});
