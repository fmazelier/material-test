import { Observable } from 'rxjs';

import { UploadPdfResponse } from '../models/form.model';

export abstract class PdfMasking {
  abstract uploadTextFile(file: File): Observable<unknown>;
  abstract uploadPdf(file: File): Observable<UploadPdfResponse>;
  abstract fetchAndDownloadProcessedPdf(fileName: string): Observable<Blob>;
}
