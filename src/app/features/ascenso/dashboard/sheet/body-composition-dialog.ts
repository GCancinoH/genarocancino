import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { form, required, FormField } from '@angular/forms/signals';
// Material
import { MatDialog, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogRef } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';
// UI
import { MatFlex } from '@features/ui/flex/flex';
import { MatSpacer } from '@features/ui/spacer/spacer';
import { FullWidthDirective } from 'src/app/features/ui/full-width/full-width.directive';
// Data
import { BodyCompositionRepository } from 'src/app/data/repositories/body-composition';
import { PlayerRepository } from 'src/app/data/repositories/player';
import { Auth } from '@angular/fire/auth';
import { resource, Resource } from '@data/models/resource';
import { RewardDialog, RewardData } from 'src/app/features/ui/reward-dialog/reward-dialog';
import { bodyCompositionModel, BodyCompositionModel } from 'src/app/data/models/body-composition';

@Component({
  selector: 'app-body-composition-dialog',
  standalone: true,
  imports: [
    FormField,
    MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatIcon, MatInput,
    MatFormField, MatLabel, MatSuffix, MatFlex, MatSpacer, FullWidthDirective, DatePipe
  ],
  template: `
    <div class="system-notification-container">
      <div class="system-header">
          <div class="header-line"></div>
          <span class="header-text">[ DATA INPUT: BODY COMPOSITION ]</span>
          <div class="header-line"></div>
      </div>

      <mat-dialog-content>
          <div class="system-date">FECHA: {{ today | date:'dd/MM/yyyy' }}</div>

          <mat-flex direction="column" gap="8px">
            <mat-flex direction="row" gap="8px">
              <mat-form-field appearance="outline" fullWidth>
                <mat-label>PESO (KG)</mat-label>
                <input matInput type="number" [formField]="bodyCompositionForm.weight">
                <mat-icon matSuffix>monitor_weight</mat-icon>
              </mat-form-field>
              <mat-form-field appearance="outline" fullWidth>
                <mat-label>BMI</mat-label>
                <input matInput type="number" [formField]="bodyCompositionForm.bmi">
                <mat-icon matSuffix>calculate</mat-icon>
              </mat-form-field>
            </mat-flex>
            <mat-flex direction="row" gap="8px">
              <mat-form-field appearance="outline" fullWidth>
                <mat-label>% MASA MUSCULAR</mat-label>
                <input matInput type="number" [formField]="bodyCompositionForm.muscleMassPercentage">
                <mat-icon matSuffix>fitness_center</mat-icon>
              </mat-form-field>
              <mat-form-field appearance="outline" fullWidth>
                <mat-label>% MASA GRASA</mat-label>
                <input matInput type="number" [formField]="bodyCompositionForm.fatMassPercentage">
                <mat-icon matSuffix>percent</mat-icon>
              </mat-form-field>
            </mat-flex>
            <mat-flex direction="row" gap="8px">
              <mat-form-field appearance="outline" fullWidth>
                <mat-label>EDAD CORPORAL</mat-label>
                <input matInput type="number" [formField]="bodyCompositionForm.bodyAge">
                <mat-icon matSuffix>cake</mat-icon>
              </mat-form-field>
              <mat-form-field appearance="outline" fullWidth>
                <mat-label>GRASA VISCERAL</mat-label>
                <input matInput type="number" [formField]="bodyCompositionForm.visceralFat">
                <mat-icon matSuffix>warning</mat-icon>
              </mat-form-field>
            </mat-flex>
          </mat-flex>
      </mat-dialog-content>

      <div class="system-footer">
          <button class="confirm-btn" (click)="onSaveData()" [disabled]="updateStatus()?.status === 'loading'">
              <span class="btn-bracket">[</span>
              @if (updateStatus()?.status === 'loading') {
                  SINCRONIZANDO...
              } @else {
                  SUBIR DATOS
              }
              <span class="btn-bracket">]</span>
          </button>
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

    .system-date {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.5);
      text-align: right;
      margin-bottom: 16px;
      letter-spacing: 1px;
    }

    /*.input-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }*/
    .input-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
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

    .system-footer {
      display: flex;
      justify-content: center;
      margin-top: 16px;
    }

    .confirm-btn {
      background: transparent;
      border: none;
      color: #2575fc;
      font-weight: 800;
      letter-spacing: 2px;
      cursor: pointer;
      padding: 12px 24px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .confirm-btn:disabled {
      color: rgba(255, 255, 255, 0.2);
      cursor: not-allowed;
    }

    .confirm-btn:not(:disabled):hover {
      color: white;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    }

    .btn-bracket {
      font-size: 1.2rem;
      transition: transform 0.2s ease;
    }

    .confirm-btn:not(:disabled):hover .btn-bracket:first-child {
      transform: translateX(-5px);
    }

    .confirm-btn:not(:disabled):hover .btn-bracket:last-child {
      transform: translateX(5px);
    }

    /* Responsiveness */
    @media (max-width: 500px) {
      .system-notification-container {
        min-width: 95vw;
        padding: 16px;
      }
    
      .input-grid {
        grid-template-columns: 1fr;
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
export class BodyCompositionDialog {
  // injects
  readonly dialogRef = inject(MatDialogRef<BodyCompositionDialog>);
  private readonly _snackbar = inject(MatSnackBar);
  private readonly _dialog = inject(MatDialog);
  private readonly bodyCompRepository = inject(BodyCompositionRepository);
  private readonly playerRepository = inject(PlayerRepository);
  private readonly auth = inject(Auth);
  // signals
  updateStatus = signal<Resource<void> | null>(null);
  // variables
  today = new Date();
  uid = this.auth.currentUser?.uid || '';
  // form
  bodyCompositionForm = form(bodyCompositionModel);


  async onSaveData() {
    if (!this.bodyCompositionForm().valid) {
      this._snackbar.open('Por favor, completa todos los campos del sistema.', 'OK', { duration: 3000 });
      return;
    }

    this.updateStatus.set(resource.loading());
    const data = this.bodyCompositionForm().value();

    const bodyData: BodyCompositionModel = {
      uID: this.uid,
      date: this.today,
      weight: data.weight,
      bmi: data.bmi,
      muscleMassPercentage: data.muscleMassPercentage,
      fatMassPercentage: data.fatMassPercentage,
      bodyAge: data.bodyAge,
      visceralFat: data.visceralFat
    };

    try {
      const [saveResult, rewardResult] = await Promise.all([
        this.bodyCompRepository.saveBodyComposition(bodyData),
        this.playerRepository.updatePlayerRewardsXPCoins(10, 10) // More rewards for body comp?
      ]);

      if (saveResult.status === 'success' && rewardResult.status === 'success') {
        this.dialogRef.close();
        this._dialog.open(RewardDialog, {
          data: {
            xp: 10,
            coins: 10,
            message: 'Análisis de composición corporal completado. Sincronización exitosa.'
          } as RewardData
        });
      } else {
        this._snackbar.open('Fallo en la sincronización de datos.', 'OK', { duration: 3000 });
      }
    } catch (error) {
      this._snackbar.open('Error de conexión con el sistema.', 'OK', { duration: 3000 });
    } finally {
      if (this.updateStatus()?.status !== 'success') {
        this.dialogRef.close();
      }
    }
  }
}
