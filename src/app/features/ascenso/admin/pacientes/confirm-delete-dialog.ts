import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { PatientProfile } from '@data/models/patient/patient-profile';

export interface ConfirmDeleteDialogData {
  patient: Pick<PatientProfile, 'uid' | 'displayName' | 'email'>;
}

/**
 * Confirmación del borrado duro del expediente.
 *
 * Solo confirma; no pide teclear nada. El borrado es definitivo, y esa es la
 * única consecuencia que este diálogo se encarga de dejar clara.
 *
 * Devuelve `true` al confirmar y `false`/`undefined` al cancelar o cerrar.
 */
@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIcon],
  template: `
    <div class="danger">
      <mat-icon class="danger-icon">warning</mat-icon>

      <h2 class="danger-title">ELIMINAR PACIENTE</h2>

      <p class="danger-text">
        Vas a eliminar a <strong>{{ nombre() }}</strong> de forma
        <strong>definitiva</strong>. Esto no se puede deshacer:
      </p>

      <ul class="danger-list">
        <li>Expediente clínico, anamnesis y objetivo</li>
        <li>Consultas, mediciones y línea de tiempo</li>
        <li>Composición corporal, sueño y citas</li>
        <li>La cuenta de acceso y sus datos</li>
      </ul>

      <p class="danger-note">
        Si solo quieres ocultarlo del listado sin perder nada, cancela y usa
        ARCHIVAR.
      </p>
    </div>

    <div class="danger-actions">
      <button type="button" class="btn-cancel" (click)="cancel()">CANCELAR</button>
      <button type="button" class="btn-delete" (click)="confirm()">ELIMINAR</button>
    </div>
  `,
  styles: `
    .danger {
      padding: 24px 24px 8px;
      text-align: center;
      background: #000;
      color: #fff;
      font-family: 'Inter', sans-serif;
    }

    .danger-icon {
      width: 40px;
      height: 40px;
      font-size: 40px;
      color: #ff3366;
    }

    .danger-title {
      margin: 8px 0 14px;
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 3px;
      color: #ff3366;
      text-shadow: 0 0 10px rgba(255, 51, 102, 0.45);
    }

    .danger-text {
      margin: 0 0 12px;
      font-size: 0.82rem;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.8);
    }

    .danger-list {
      margin: 0 0 14px;
      padding: 0;
      list-style: none;
      text-align: left;
      font-size: 0.75rem;
      line-height: 1.9;
      color: rgba(255, 255, 255, 0.6);
    }

    .danger-list li::before {
      content: '× ';
      color: #ff3366;
      font-weight: 800;
    }

    .danger-note {
      margin: 0;
      padding: 10px 12px;
      font-size: 0.7rem;
      line-height: 1.6;
      letter-spacing: 0.5px;
      color: rgb(255, 170, 0);
      background: rgba(255, 170, 0, 0.07);
      border: 1px solid rgba(255, 170, 0, 0.3);
      border-radius: 3px;
    }

    .danger-actions {
      display: flex;
      gap: 10px;
      padding: 18px 24px 22px;
      background: #000;
    }

    .danger-actions button {
      flex: 1;
      padding: 10px 12px;
      font-family: inherit;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 2px;
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-cancel {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: rgba(255, 255, 255, 0.7);
    }

    .btn-cancel:hover {
      border-color: rgba(255, 255, 255, 0.6);
      color: #fff;
    }

    .btn-delete {
      background: rgba(255, 51, 102, 0.15);
      border: 1px solid #ff3366;
      color: #ff3366;
    }

    .btn-delete:hover {
      background: #ff3366;
      color: #000;
      box-shadow: 0 0 14px rgba(255, 51, 102, 0.5);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDeleteDialog {
  protected readonly data = inject<ConfirmDeleteDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDeleteDialog>);

  /** Nombre con el que se dirige el diálogo al nutriólogo. */
  protected readonly nombre = computed<string>(
    () => this.data.patient.displayName || this.data.patient.email || 'este paciente'
  );

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  protected confirm(): void {
    this.dialogRef.close(true);
  }
}
