import { Component, computed, input } from '@angular/core';

/** An icon's outline beside its fill, or the fill on hover; each takes the colour of the text and the size `--size`. */
@Component({
  selector: 'studio-ui-pair',
  templateUrl: './pair.component.html',
  styleUrl: './pair.component.scss',
  host: { '[class.hover]': "mode() === 'hover'" }
})
export class PairComponent {
  /** The URL of the outline, undefined when there is no file. */
  readonly outline = input<string>();
  readonly fill = input<string>();
  readonly mode = input<'side' | 'hover'>('side');

  protected readonly outlineMask = computed(() => mask(this.outline()));
  protected readonly fillMask = computed(() => mask(this.fill()));
}

const mask = (url: string | undefined): string | null => (url ? `url('${url}')` : null);
