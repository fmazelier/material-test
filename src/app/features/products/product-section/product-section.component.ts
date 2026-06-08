import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-product-section',
  template: `
    <h2 class="text-2xl font-semibold">{{ heading() }}</h2>
    <p class="text-on-surface/60 mt-2">
      Contenu de démonstration pour la section « {{ heading() }} ».
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProductSectionComponent {
  readonly heading = input('Section');
}
