import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * A flexible layout component that provides an easy way to create flexbox containers.
 */
@Component({
  selector: 'mat-flex',
  template: `<ng-content />`,
  styles: `
    :host {
      display: flex;
    }
    :host(.fill) ::ng-deep > * {
      flex: 1;
      min-width: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }
  `,
  host: {
    '[style.flex-direction]': 'direction()',
    '[style.gap]': 'gapStyle()',
    '[style.align-items]': 'align()',
    '[style.justify-content]': 'justify()',
    '[style.flex-wrap]': 'wrap()',
    '[class.fill]': 'fill()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatFlex {
  /** Flex direction: 'row', 'column', 'row-reverse', or 'column-reverse'. Defaults to 'row'. */
  direction = input<'row' | 'column' | 'row-reverse' | 'column-reverse'>('row');

  /** Gap between items. Can be a number (px) or a string (e.g., '1rem', '10px'). */
  gap = input<string | number>(0);

  /** Align items (cross-axis): 'start', 'center', 'end', 'stretch', etc. Defaults to 'stretch'. */
  align = input<string>('center');

  /** Justify content (main-axis): 'start', 'center', 'end', 'space-between', etc. Defaults to 'start'. */
  justify = input<string>('start');

  /** Flex wrap: 'nowrap', 'wrap', or 'wrap-reverse'. Defaults to 'nowrap'. */
  wrap = input<'nowrap' | 'wrap' | 'wrap-reverse'>('nowrap');

  /** Whether children should expand to fill the available space equally. */
  fill = input<boolean, boolean | string>(false, {
    transform: (v: boolean | string) => typeof v === 'string' ? v === '' || v === 'true' : v
  });

  /** Computed gap style to handle numeric values by appending 'px'. */
  protected gapStyle = computed(() => {
    const value = this.gap();
    if (typeof value === 'number') return `${value}px`;
    return value;
  });
}
