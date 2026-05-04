import { Observable } from 'rxjs';

import { UploadPdfResponse } from '../models/form.model';

export abstract class PdfMaskingServiceAbstract {
  abstract uploadTextFile(file: File): Observable<unknown>;
  abstract uploadPdf(file: File): Observable<UploadPdfResponse>;
  abstract downloadProcessedPdf(fileName: string): Observable<Blob>;
}
