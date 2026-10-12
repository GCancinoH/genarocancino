import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/**
 * Placeholder de la agenda (Fase 2).
 *
 * La ruta existe desde Fase 0 para que la navegación del shell sea navegable
 * y comprobable. El calendario mes/agenda y el CRUD de citas llegan en la
 * Fase 2, junto con la colección `appointments`.
 */
@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [MatIcon],
  template: `
    <div class="section-container">
      <div class="system-header">
        <div class="header-line"></div>
        <span class="header-text">[ AGENDA DE CONSULTAS ]</span>
        <div class="header-line"></div>
      </div>

      <div class="placeholder-terminal">
        <mat-icon>calendar_month</mat-icon>
        <div class="placeholder-title">MÓDULO EN CONSTRUCCIÓN</div>
        <div class="placeholder-text">
          Calendario mensual, agenda por día y registro de citas.<br />
          Se activa en la Fase 2.
        </div>
      </div>
    </div>
  `,
  styles: `
    .section-container {
      padding: 30px 40px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .system-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 30px;
    }

    .header-line {
      flex-grow: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, #2575fc, transparent);
    }

    .header-text {
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 3px;
      color: #2575fc;
      text-shadow: 0 0 10px rgba(37, 117, 252, 0.5);
    }

    .placeholder-terminal {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 70px 20px;
      background: rgba(5, 5, 5, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      text-align: center;
    }

    .placeholder-terminal mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: rgba(37, 117, 252, 0.35);
      margin-bottom: 16px;
    }

    .placeholder-title {
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.95rem;
      letter-spacing: 3px;
      color: #2575fc;
      text-shadow: 0 0 8px rgba(37, 117, 252, 0.4);
      margin-bottom: 12px;
    }

    .placeholder-text {
      font-size: 0.8rem;
      line-height: 1.8;
      letter-spacing: 1px;
      color: rgba(255, 255, 255, 0.4);
    }

    @media (max-width: 768px) {
      .section-container {
        padding: 20px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaComponent {}
