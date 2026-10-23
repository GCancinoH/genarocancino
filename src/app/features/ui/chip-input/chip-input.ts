import { ChangeDetectionStrategy, Component, ElementRef, model, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';

/**
 * Campo de etiquetas (chips) controlado por signals.
 *
 * Escribe un valor y pulsa Enter (o el botón) para añadirlo; Backspace con
 * el input vacío borra el último. Pensado para móvil: sin drag & drop.
 */
@Component({
  selector: 'gc-chip-input',
  imports: [FormsModule, MatIcon],
  template: `
    <div class="chip-box" (click)="focusInput()">
      @for (item of items(); track item) {
        <span class="chip">
          {{ item }}
          <button type="button" class="chip-remove" (click)="remove(item, $event)" aria-label="Quitar {{ item }}">
            <mat-icon>close</mat-icon>
          </button>
        </span>
      }

      <input
        #input
        class="chip-input"
        type="text"
        [placeholder]="placeholder()"
        [ngModel]="draft()"
        (ngModelChange)="draft.set($event)"
        (keydown.enter)="add($event)"
        (keydown.backspace)="onBackspace($event)"
      />
    </div>
  `,
  styles: `
    /*
     * El contenedor imita la geometría del campo con contorno de Material
     * (min-height, radio y padding de 16 px, borde tomado de los tokens del
     * tema) para que Intolerancias no se lea como un control ajeno al
     * resto del formulario.
     *
     * El tamaño de fuente va en 1rem porque es el de
     * \`--mat-sys-body-large-size\`, que es el que Material aplica dentro de
     * un \`mat-form-field\`; antes acá era 0.85rem y se notaba.
     */
    .chip-box {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      min-height: 56px;
      padding: 8px 16px;
      background: transparent;
      border: 1px solid var(--mat-sys-outline-variant, #c4c6d0);
      border-radius: 4px;
      cursor: text;
      font-size: 1rem;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .chip-box:hover {
      border-color: var(--mat-sys-outline, #74777f);
    }

    .chip-box:focus-within {
      border-color: #2575fc;
      box-shadow: 0 0 10px rgba(37, 117, 252, 0.25);
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: rgba(37, 117, 252, 0.12);
      border: 1px solid rgba(37, 117, 252, 0.4);
      color: #2575fc;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 4px 6px 4px 10px;
      border-radius: 3px;
      text-transform: uppercase;
    }

    .chip-remove {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      display: inline-flex;
      color: rgba(37, 117, 252, 0.7);
    }

    .chip-remove:hover {
      color: #ff3366;
    }

    .chip-remove mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .chip-input {
      flex: 1;
      min-width: 120px;
      background: transparent;
      border: none;
      outline: none;
      color: #fff;
      /* Hereda de .chip-box, así que coincide con el resto de los inputs
       * sin repetir el tamaño acá. */
      font-family: inherit;
      font-size: inherit;
      padding: 6px 0;
    }

    .chip-input::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipInput {
  /** Etiquetas actuales. */
  readonly items = model<string[]>([]);
  readonly placeholder = model<string>('ESCRIBE Y PULSA ENTER');

  protected readonly draft = signal<string>('');

  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('input');

  protected add(event?: Event): void {
    event?.preventDefault();

    const value = this.draft().trim();
    if (!value) return;

    const current = this.items();
    // Sin duplicados, comparando sin distinguir mayúsculas.
    const exists = current.some((item) => item.toLowerCase() === value.toLowerCase());
    if (!exists) this.items.set([...current, value]);

    this.draft.set('');
    this.focusInput();
  }

  protected remove(item: string, event: Event): void {
    event.stopPropagation();
    this.items.set(this.items().filter((current) => current !== item));
  }

  protected onBackspace(event: Event): void {
    if (this.draft() === '' && this.items().length) {
      this.items.set(this.items().slice(0, -1));
      event.preventDefault();
    }
  }

  protected focusInput(): void {
    this.inputRef()?.nativeElement.focus();
  }
}
