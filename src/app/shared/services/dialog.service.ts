import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';

import {
  AlertDialogComponent,
  AlertDialogData,
} from '@shared/components/alert-dialog/alert-dialog.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '@shared/components/confirm-dialog/confirm-dialog.component';
import {
  PromptDialogComponent,
  PromptDialogData,
} from '@shared/components/prompt-dialog/prompt-dialog.component';

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(MatDialog);

  alert(data: AlertDialogData): Observable<void> {
    return this.dialog
      .open<AlertDialogComponent, AlertDialogData, void>(AlertDialogComponent, { data })
      .afterClosed();
  }

  confirm(data: ConfirmDialogData): Observable<boolean | undefined> {
    return this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, { data })
      .afterClosed();
  }

  prompt(data: PromptDialogData): Observable<string | undefined> {
    return this.dialog
      .open<PromptDialogComponent, PromptDialogData, string>(PromptDialogComponent, { data })
      .afterClosed();
  }
}
