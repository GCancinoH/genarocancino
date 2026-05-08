import { Component, computed, input } from '@angular/core';

/**
 * A layout component that creates empty space between components.
 */
@Component({
  selector: 'mat-spacer',
  standalone: true,
  template: `
    <div [style.width]="widthStyle()" 
         [style.height]="heightStyle()"
         [style.flex]="flexStyle()"></div>
  `,
  styles: `
    :host {
      display: block;
    }
  `
})
export class MatSpacer {
  /** Width of the spacer. Can be a number (px) or a string (e.g. '24', '1rem'). */
  width = input<string | number | undefined>();

  /** Height of the spacer. Can be a number (px) or a string (e.g. '24', '1rem'). */
  height = input<string | number | undefined>();

  /** Flex shorthand. If number, it sets flex: n 1 0%. */
  flex = input<string | number | undefined>();

  protected widthStyle = computed(() => this.formatValue(this.width()));
  protected heightStyle = computed(() => this.formatValue(this.height()));
  protected flexStyle = computed(() => {
    const f = this.flex();
    if (f === undefined) return null;
    return typeof f === 'number' ? `${f} 1 0%` : f;
  });

  private formatValue(value: string | number | undefined): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number') return `${value}px`;
    
    // If it's a string representing a number (like "24"), add "px"
    const isNumeric = !isNaN(Number(value)) && !isNaN(parseFloat(value));
    return isNumeric ? `${value}px` : value;
  }
}
