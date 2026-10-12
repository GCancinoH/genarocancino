import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { normalizePhone, waLink, welcomeMessage } from '@data/services/whatsapp';

export interface CredentialsDialogData {
  displayName: string | null;
  email: string | null;
  /** Si el backend lo devuelve (solo en local). En producción nunca viaja. */
  password?: string;
  /** Confirmación real del envío del correo, tal como la devolvió el backend. */
  emailSent?: boolean;
  /** Motivo del fallo, si `emailSent` es false. */
  emailError?: string;
  /** Teléfono capturado en el alta, para el envío de bienvenida. */
  phone?: string | null;
}

/**
 * Pantalla final del alta: muestra las credenciales generadas.
 *
 * El backend (Flask + Admin SDK) genera el password temporal y lo envía por
 * correo al paciente. Por seguridad NO lo devuelve en la respuesta JSON, así
 * que esta pantalla solo confirma a quién se le enviaron las credenciales.
 */
@Component({
  selector: 'app-credentials-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIcon, MatSnackBarModule],
  template: `
    <div class="credentials">
      <div class="header">
        <span class="bracket">[</span>
        <span class="title">CREDENCIALES GENERADAS</span>
        <span class="bracket">]</span>
      </div>

      <div class="body">
        <div class="row">
          <span class="label">NOMBRE</span>
          <span class="value">{{ data.displayName ?? '—' }}</span>
        </div>

        <div class="row">
          <span class="label">CORREO</span>
          <span class="value">{{ data.email ?? '—' }}</span>
        </div>

        @if (waPhone()) {
          <div class="row">
            <span class="label">TELÉFONO</span>
            <span class="value">{{ waPhone() }}</span>
          </div>
        }

        @if (data.password) {
          <div class="row password-row">
            <span class="label">CONTRASEÑA TEMPORAL</span>
            <span class="value password">{{ data.password }}</span>
          </div>
        }

        <div class="notice" [class.failed]="data.emailSent === false">
          <mat-icon>{{ data.emailSent === false ? 'mail_lock' : 'mail' }}</mat-icon>
          @if (data.emailSent === false) {
            <span>
              <strong>EL CORREO NO SE PUDO ENVIAR.</strong>
              @if (data.emailError) {
                ({{ data.emailError }})
              }
              Las credenciales no llegaron a {{ data.email ?? 'su correo' }}: entregarlas al paciente de forma manual.
            </span>
          } @else {
            <span>
              El sistema envió las credenciales a {{ data.email ?? 'su correo' }}.
              El paciente debe cambiar su contraseña al ingresar.
            </span>
          }
        </div>
      </div>

      <div class="actions">
        <button class="action-btn" (click)="copy()">
          <span class="bracket">[</span>
          <mat-icon class="icon-inline">content_copy</mat-icon>
          COPIAR TODO
          <span class="bracket">]</span>
        </button>

        @if (waLink()) {
          <button class="action-btn wa" (click)="openWhatsApp()">
            <span class="bracket">[</span>
            <mat-icon class="icon-inline">chat</mat-icon>
            WHATSAPP
            <span class="bracket">]</span>
          </button>
        }

        <button class="action-btn primary" (click)="close()">
          <span class="bracket">[</span>
          CERRAR
          <span class="bracket">]</span>
        </button>
      </div>
    </div>
  `,
  styles: `
    .credentials {
      background: #000;
      color: #fff;
      font-family: 'Inter', sans-serif;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 20px 16px 12px;
    }

    .title {
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 3px;
      color: #2575fc;
      text-shadow: 0 0 10px rgba(37, 117, 252, 0.5);
    }

    .bracket {
      color: rgba(37, 117, 252, 0.6);
    }

    .body {
      padding: 0 16px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .label {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: rgba(255, 255, 255, 0.4);
      flex-shrink: 0;
    }

    .value {
      font-size: 0.85rem;
      color: #fff;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .password {
      font-family: 'Courier New', Courier, monospace;
      color: #00ff66;
      text-shadow: 0 0 6px rgba(0, 255, 102, 0.4);
    }

    .notice {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 16px;
      padding: 12px 14px;
      border: 1px solid rgba(255, 170, 0, 0.4);
      background: rgba(255, 170, 0, 0.07);
      border-radius: 4px;
      color: rgb(255, 170, 0);
      font-size: 0.7rem;
      letter-spacing: 0.5px;
      line-height: 1.6;
    }

    .notice mat-icon {
      flex-shrink: 0;
    }

    .notice.failed {
      border-color: rgba(255, 61, 61, 0.45);
      background: rgba(255, 61, 61, 0.08);
      color: rgb(255, 90, 90);
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 20px 16px 24px;
      flex-wrap: wrap;
    }

    .action-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.7);
      font-family: inherit;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 2px;
      padding: 10px 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }

    .action-btn:hover {
      border-color: #2575fc;
      color: #fff;
    }

    .action-btn.primary {
      border-color: rgba(37, 117, 252, 0.5);
      color: #2575fc;
    }

    .action-btn.primary:hover {
      background: rgba(37, 117, 252, 0.12);
    }

    .action-btn.wa {
      border-color: rgba(37, 211, 102, 0.45);
      color: #25d366;
    }

    .action-btn.wa:hover {
      background: rgba(37, 211, 102, 0.12);
      border-color: #25d366;
    }

    .icon-inline {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredentialsDialog {
  protected readonly data = inject<CredentialsDialogData>(MAT_DIALOG_DATA);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<CredentialsDialog>);

  /** Teléfono normalizado (solo dígitos), o null si no es válido. */
  protected readonly waPhone = signal(normalizePhone(this.data.phone));

  /** Enlace wa.me con el mensaje de bienvenida precargado. */
  protected readonly waLink = computed(() =>
    waLink(this.data.phone, welcomeMessage(this.data.displayName))
  );

  /** Abre WhatsApp con el chat listo; nada se envía hasta que se pulse enviar. */
  protected openWhatsApp(): void {
    const link = this.waLink();
    if (!link) return;
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  protected async copy(): Promise<void> {
    const lines = [
      `Nombre: ${this.data.displayName ?? '—'}`,
      `Correo: ${this.data.email ?? '—'}`,
    ];
    if (this.data.password) {
      lines.push(`Contraseña temporal: ${this.data.password}`);
    }
    const text = lines.join('\n');

    try {
      await navigator.clipboard.writeText(text);
      this.snackBar.open('Copiado al portapapeles.', 'OK', { duration: 2500 });
    } catch {
      this.snackBar.open('No se pudo copiar. Copia a mano.', undefined, { duration: 3000 });
    }
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
