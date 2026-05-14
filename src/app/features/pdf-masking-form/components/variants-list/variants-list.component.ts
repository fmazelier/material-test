import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';

import { VariantsStoreService } from '@features/pdf-masking-form/services/variants-store/variants-store.service';
import { IconComponent } from '@shared/components/icon/icon.component';

import { LucideChevronDown, LucideTrash2 } from '@lucide/angular';

@Component({
  selector: 'app-variants-list',
  imports: [MatChipsModule, MatButtonModule, MatProgressSpinnerModule, IconComponent, MatTooltip],
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
}
