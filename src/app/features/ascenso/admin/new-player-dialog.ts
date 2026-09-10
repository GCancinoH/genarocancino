import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, required, FormField } from '@angular/forms/signals';
// Material
import { MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogRef } from '@angular/material/dialog';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';
// UI & Models
import { MatFlex } from '@features/ui/flex/flex';
import { MatSpacer } from '@features/ui/spacer/spacer';
import { FullWidthDirective } from 'src/app/features/ui/full-width/full-width.directive';
import { newPlayerModel, NewPlayer } from 'src/app/data/models/player/new-player';
import { AdminRepository, PlayerCreationResponse } from 'src/app/data/repositories/admin';
import { resource, Resource } from '@data/models/resource';

@Component({
  selector: 'app-new-player-dialog',
  standalone: true,
  imports: [
    FormField,
    MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatIcon, MatInput,
    MatFormField, MatLabel, MatSuffix, MatFlex, MatSpacer, FullWidthDirective, MatIconButton
  ],
  template: `
    <div class="system-notification-container">
      <div class="system-header">
          <div class="header-line"></div>
          <span class="header-text">[ REGISTER NEW PLAYER ]</span>
          <div class="header-line"></div>
      </div>

      <mat-dialog-content>
        @if (!createdUser()) {
          <mat-flex direction="column" gap="16px">
            <mat-form-field appearance="outline" fullWidth>
              <mat-label>NOMBRE COMPLETO</mat-label>
              <input matInput type="text" [formField]="playerForm.nombre" placeholder="Ej. Juan Pérez">
              <mat-icon matSuffix>person</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" fullWidth>
              <mat-label>EDAD</mat-label>
              <input matInput type="number" [formField]="playerForm.edad">
              <mat-icon matSuffix>cake</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" fullWidth>
              <mat-label>CORREO ELECTRÓNICO</mat-label>
              <input matInput type="email" [formField]="playerForm.correo" placeholder="ejemplo@correo.com">
              <mat-icon matSuffix>email</mat-icon>
            </mat-form-field>
          </mat-flex>
        } @else {
          <div class="system-success-screen">
            <mat-icon class="success-icon">check_circle</mat-icon>
            <div class="success-title">JUGADOR REGISTRADO</div>
            
            <div class="success-details">
              <div class="detail-row">
                <span class="detail-label">UID:</span>
                <span class="detail-val">{{ createdUser()?.uid }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">NOMBRE:</span>
                <span class="detail-val">{{ createdUser()?.displayName }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">CORREO:</span>
                <span class="detail-val">{{ createdUser()?.email }}</span>
              </div>
              <div class="detail-row password-highlight">
                <span class="detail-label">CLAVE TEMP:</span>
                <div class="pass-copy-container">
                  <span class="detail-val pass-text">{{ createdUser()?.password }}</span>
                  <button mat-icon-button class="copy-btn" (click)="copyPassword(createdUser()?.password)">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </mat-dialog-content>

      <div class="system-footer">
        @if (!createdUser()) {
          <button class="confirm-btn" (click)="onRegisterPlayer()" [disabled]="registerStatus()?.status === 'loading'">
              <span class="btn-bracket">[</span>
              @if (registerStatus()?.status === 'loading') {
                  REGISTRANDO...
              } @else {
                  CREAR USUARIO
              }
              <span class="btn-bracket">]</span>
          </button>
          <button class="cancel-btn" (click)="dialogRef.close(false)" [disabled]="registerStatus()?.status === 'loading'">
              <span class="btn-bracket">[</span> CANCELAR <span class="btn-bracket">]</span>
          </button>
        } @else {
          <button class="confirm-btn" (click)="dialogRef.close(true)">
              <span class="btn-bracket">[</span> CERRAR <span class="btn-bracket">]</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    .system-notification-container {
      background: rgba(5, 5, 5, 0.98);
      border: 2px solid rgba(37, 117, 252, 0.3);
      padding: 18px;
      color: white;
      font-family: 'Inter', sans-serif;
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 40px rgba(37, 117, 252, 0.2);
      min-width: 450px;
    }

    .system-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .header-line {
      flex-grow: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, #2575fc, transparent);
    }

    .header-text {
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 2px;
      color: #2575fc;
      text-shadow: 0 0 10px rgba(37, 117, 252, 0.5);
    }

    /* Material Form Field Customization */
    ::ng-deep .mat-mdc-form-field {
      width: 100%;
    }

    ::ng-deep .mdc-text-field--outlined {
      background: rgba(255, 255, 255, 0.03) !important;
    }

    ::ng-deep .mdc-notched-outline__leading,
    ::ng-deep .mdc-notched-outline__notch,
    ::ng-deep .mdc-notched-outline__trailing {
      border-color: rgba(255, 255, 255, 0.1) !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
      border-color: #2575fc !important;
      border-width: 2px !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-floating-label {
      color: #2575fc !important;
    }

    ::ng-deep .mat-mdc-text-field-wrapper .mat-mdc-form-field-input-control {
      color: white !important;
      font-weight: 600;
    }

    ::ng-deep .mat-mdc-form-field-icon-suffix mat-icon {
      color: rgba(255, 255, 255, 0.3);
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-form-field-icon-suffix mat-icon {
      color: #2575fc;
      filter: drop-shadow(0 0 5px rgba(37, 117, 252, 0.5));
    }

    /* Success Screen */
    .system-success-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px 0;
    }

    .success-icon {
      font-size: 54px !important;
      width: 54px !important;
      height: 54px !important;
      color: #00ff66 !important;
      filter: drop-shadow(0 0 10px rgba(0, 255, 102, 0.5));
      margin-bottom: 12px;
    }

    .success-title {
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: 2px;
      color: #00ff66;
      text-shadow: 0 0 10px rgba(0, 255, 102, 0.3);
      margin-bottom: 20px;
    }

    .success-details {
      width: 100%;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 14px;
      border-radius: 4px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      font-size: 0.85rem;
    }

    .detail-row:last-child {
      margin-bottom: 0;
    }

    .detail-label {
      color: rgba(255, 255, 255, 0.5);
      font-weight: 700;
      letter-spacing: 1px;
    }

    .detail-val {
      font-family: 'Courier New', Courier, monospace;
      color: white;
      font-weight: 600;
    }

    .password-highlight {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px dashed rgba(255, 255, 255, 0.15);
    }

    .password-highlight .detail-label {
      color: #2575fc;
      text-shadow: 0 0 5px rgba(37, 117, 252, 0.3);
    }

    .pass-copy-container {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(37, 117, 252, 0.1);
      border: 1px solid rgba(37, 117, 252, 0.3);
      padding: 2px 2px 2px 10px;
      border-radius: 4px;
    }

    .pass-text {
      color: #00ff66;
      font-weight: 800;
    }

    .copy-btn {
      width: 32px !important;
      height: 32px !important;
      line-height: 32px !important;
    }

    .copy-btn mat-icon {
      font-size: 18px !important;
      color: #2575fc;
    }

    /* Footer & Buttons */
    .system-footer {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-top: 24px;
    }

    .confirm-btn, .cancel-btn {
      background: transparent;
      border: none;
      font-weight: 800;
      letter-spacing: 2px;
      cursor: pointer;
      padding: 12px 20px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
    }

    .confirm-btn {
      color: #2575fc;
    }

    .cancel-btn {
      color: rgba(255, 255, 255, 0.4);
    }

    .confirm-btn:disabled, .cancel-btn:disabled {
      color: rgba(255, 255, 255, 0.2);
      cursor: not-allowed;
    }

    .confirm-btn:not(:disabled):hover {
      color: white;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    }

    .cancel-btn:not(:disabled):hover {
      color: #ff3366;
      text-shadow: 0 0 10px rgba(255, 51, 102, 0.5);
    }

    .btn-bracket {
      font-size: 1.1rem;
      transition: transform 0.2s ease;
    }

    .confirm-btn:not(:disabled):hover .btn-bracket:first-child,
    .cancel-btn:not(:disabled):hover .btn-bracket:first-child {
      transform: translateX(-3px);
    }

    .confirm-btn:not(:disabled):hover .btn-bracket:last-child,
    .cancel-btn:not(:disabled):hover .btn-bracket:last-child {
      transform: translateX(3px);
    }

    /* Responsiveness */
    @media (max-width: 500px) {
      .system-notification-container {
        min-width: 95vw;
        padding: 16px;
      }
    }

    /* Material Dialog Overrides */
    ::ng-deep .mat-mdc-dialog-container {
      padding: 0 !important;
    }

    ::ng-deep .mdc-dialog__surface {
      background: transparent !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewPlayerDialog {
  readonly dialogRef = inject(MatDialogRef<NewPlayerDialog>);
  private readonly _snackbar = inject(MatSnackBar);
  private readonly adminRepository = inject(AdminRepository);

  // signals
  registerStatus = signal<Resource<PlayerCreationResponse> | null>(null);
  createdUser = signal<PlayerCreationResponse | null>(null);

  // form using Angular 21 Signal Form API
  playerForm = form(newPlayerModel, (f) => {
    required(f.nombre);
    required(f.edad);
    required(f.correo);
  });

  async onRegisterPlayer() {
    if (!this.playerForm().valid) {
      this._snackbar.open('Por favor, completa todos los campos del sistema.', 'OK', { duration: 3000 });
      return;
    }

    this.registerStatus.set(resource.loading());
    const data = this.playerForm().value();

    try {
      const result = await this.adminRepository.createPlayer(data);
      this.registerStatus.set(result);

      if (result.status === 'success' && result.data) {
        this.createdUser.set(result.data);
        this._snackbar.open('Jugador creado en la base de datos.', 'OK', { duration: 3000 });
      } else if (result.status === 'error') {
        this._snackbar.open(result.message || 'Error en la sincronización del jugador.', 'OK', { duration: 3000 });
      } else {
        this._snackbar.open('Error en la sincronización del jugador.', 'OK', { duration: 3000 });
      }
    } catch (error) {
      this._snackbar.open('Error crítico al conectar con el servidor administrativo.', 'OK', { duration: 3000 });
      this.registerStatus.set(resource.error('Connection failed'));
    }
  }

  copyPassword(password?: string) {
    if (!password) return;
    navigator.clipboard.writeText(password).then(() => {
      this._snackbar.open('Contraseña copiada al portapapeles.', 'OK', { duration: 2000 });
    });
  }
}
