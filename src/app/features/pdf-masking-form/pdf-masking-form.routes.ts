import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { MOCKS_ENABLED } from '@mazelab/ng-kit/token';

import PdfMaskingFormComponent from './pdf-masking-form.component';
import { PdfMasking } from './services/pdf-masking/pdf-masking.abstract';
import { PdfMaskingMockService } from './services/pdf-masking/pdf-masking.mock.service';
import { PdfMaskingService } from './services/pdf-masking/pdf-masking.service';
import { VariantsStoreService } from './services/variants-store/variants-store.service';

const pdfMaskingFormRoutes: Routes = [
  {
    path: '',
    component: PdfMaskingFormComponent,
    providers: [
      {
        provide: PdfMasking,
        useFactory: () =>
          inject(MOCKS_ENABLED) ? new PdfMaskingMockService() : new PdfMaskingService(),
      },
      VariantsStoreService,
    ],
  },
];

export default pdfMaskingFormRoutes;
