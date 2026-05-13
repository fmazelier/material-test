import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';
import { VariantsStoreService } from '@features/pdf-masking-form/services/variants-store/variants-store.service';
import { LucideChevronDown, LucideTrash2 } from '@lucide/angular';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-variants-list',
  imports: [
    MatChipsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    IconComponent,
    MatTooltip,
  ],
  templateUrl: './variants-list.component.html',
  styleUrl: './variants-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantsListComponent {
  protected readonly store = inject(VariantsStoreService);
  protected readonly icons = {
    chevronDown: LucideChevronDown,
    trash: LucideTrash2,
  };

  readonly dialog = inject(MatDialog);

  openDialog(enterAnimationDuration: string, exitAnimationDuration: string): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '250px',
      enterAnimationDuration,
      exitAnimationDuration,
      data: {
        confirmLabel: 'toto',
      },
    });
  }

  constructor() {
    this.store.variants$.pipe(takeUntilDestroyed()).subscribe();
  }
}
