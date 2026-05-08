import { Routes } from '@angular/router';

import PdfMaskingFormComponent from './pdf-masking-form.component';
import { PdfMasking } from './services/pdf-masking.abstract';
import { PdfMaskingService } from './services/pdf-masking.service';

const pdfMaskingFormRoutes: Routes = [
  {
    path: '',
    component: PdfMaskingFormComponent,
    providers: [
      // { provide: PdfMasking, useClass: PdfMaskingMockService }],
      { provide: PdfMasking, useClass: PdfMaskingService },
    ],
  },
];

export default pdfMaskingFormRoutes;
