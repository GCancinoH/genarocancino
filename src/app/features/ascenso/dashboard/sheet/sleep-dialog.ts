import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { form, required, FormField } from '@angular/forms/signals';
// Material
import { MatDialog, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogRef } from '@angular/material/dialog';
import { RewardDialog, RewardData } from 'src/app/features/ui/reward-dialog/reward-dialog';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatFlex } from '@features/ui/flex/flex';
import { MatFormField, MatLabel, MatError, MatHint, MatPrefix } from '@angular/material/form-field';
import { MatSpacer } from '@features/ui/spacer/spacer';
import { MatSnackBar } from '@angular/material/snack-bar';
// Models
import { SleepModel, sleepModel } from 'src/app/data/models/sleep';
// Repositories
import { PlayerRepository } from 'src/app/data/repositories/player';
// Directives
import { FullWidthDirective } from 'src/app/features/ui/full-width/full-width.directive';
import { SleepRepository } from 'src/app/data/repositories/sleep';
import { Auth } from '@angular/fire/auth';
import { resource, Resource } from '@data/models/resource';

@Component({
  selector: 'app-sleep-dialog',
  imports: [
    DatePipe, FormField,
    MatDialogTitle, MatDialogContent, MatDialogActions, MatButton,
    MatFormField, MatLabel, MatError, MatInput, MatIcon, MatSpacer,
    MatFlex,
    FullWidthDirective
  ],
  template: `
    <h2 mat-dialog-title>Registro de sueño del dia {{today | date:'MMMM dd, yyyy'}}</h2>
    <mat-dialog-content>
      <mat-spacer height="20" />
      <h3>Horas de sueño</h3>
      <mat-spacer height="10" />
      <mat-flex direction="row" gap="8px">
        <mat-form-field appearance="outline" fullWidth>
          <mat-label>Desde</mat-label>
          <input matInput placeholder="" [formField]="sleepForm.from">
        </mat-form-field>
        <mat-form-field appearance="outline" fullWidth>
          <mat-label>Hasta</mat-label>
          <input matInput placeholder="" [formField]="sleepForm.to">
        </mat-form-field>        
      </mat-flex>
      <mat-form-field appearance="outline" fullWidth>
        <mat-label>Total</mat-label>
        <input matInput placeholder="" [formField]="sleepForm.duration">
      </mat-form-field>
      <h3>Ciclos de sueño</h3>
      <mat-spacer height="10" />
      <mat-flex direction="row" gap="8px">
        <mat-form-field appearance="outline" fullWidth>
          <mat-label>Sueño Profundo</mat-label>
          <input matInput placeholder="" [formField]="sleepForm.deep">
        </mat-form-field>
        <mat-form-field appearance="outline" fullWidth>
          <mat-label>Sueño Ligero</mat-label>
          <input matInput placeholder="" [formField]="sleepForm.light">
        </mat-form-field>
        <mat-form-field appearance="outline" fullWidth>
          <mat-label>Sueño REM</mat-label>
          <input matInput placeholder="" [formField]="sleepForm.rem">
        </mat-form-field>
      </mat-flex>
      <h3>Otros datos</h3>
      <mat-spacer height="10" />
      <mat-form-field appearance="outline" fullWidth>
        <mat-label>Desperté en la noche</mat-label>
        <input matInput placeholder="" type="number" [formField]="sleepForm.wakeUps">
      </mat-form-field>
      <mat-flex direction="row" gap="8px">
        <mat-form-field appearance="outline" fullWidth>
          <mat-label>Frecuencia cardiaca promedio</mat-label>
          <input matInput placeholder="" type="number" [formField]="sleepForm.avgHR">
        </mat-form-field>
        <mat-form-field appearance="outline" fullWidth>
          <mat-label>Saturación de oxígeno promedio</mat-label>
          <input matInput placeholder="" type="number" [formField]="sleepForm.avgspo2">
        </mat-form-field>        
      </mat-flex>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button matButton="filled" cdkFocusInitial (click)="onSaveSleepData()" fullWidth>Guardar Datos</button>
    </mat-dialog-actions>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SleepDialog {
  // injects
  readonly dialogRef = inject(MatDialogRef<SleepDialog>);
  private readonly _snackbar = inject(MatSnackBar);
  private readonly sleepRepository = inject(SleepRepository);
  private readonly playerRepository = inject(PlayerRepository);
  private readonly auth = inject(Auth);
  // signals
  updateStatus = signal<Resource<void> | null>(null);
  // variables
  today = new Date();
  player = this.auth.currentUser;
  uid = this.playerRepository.getPlayer()?.uid || '';

  // form
  sleepForm = form(sleepModel, (f) => {
    required(f.duration);
    required(f.from);
    required(f.to);
    required(f.rem);
    required(f.deep);
    required(f.light);
    required(f.wakeUps);
    required(f.avgHR);
    required(f.avgspo2)
  });

  private readonly _dialog = inject(MatDialog);

  async onSaveSleepData() {
    // 1. Validate BEFORE doing anything else
    if (!this.sleepForm().valid) {
      this._snackbar.open('Por favor, complete todos los campos requeridos.', 'OK', { duration: 3000 });
      return;
    }

    const data = this.sleepForm().value();

    this.updateStatus.set(resource.loading());
    const sleepData: SleepModel = {
      uID: this.uid,
      date: this.today,
      duration: data.duration,
      from: data.from,
      to: data.to,
      deep: data.deep,
      light: data.light,
      rem: data.rem,
      wakeUps: data.wakeUps,
      avgHR: data.avgHR,
      avgspo2: data.avgspo2
    }

    try {
      // run both promises in parallel
      const [sleepResult, rewardResult] = await Promise.all([
        this.sleepRepository.saveSleepData(sleepData),
        this.playerRepository.updatePlayerRewardsXPCoins(5, 5)
      ]);

      // handle status
      if (sleepResult.status === 'success' && rewardResult.status === 'success') {
        this.dialogRef.close();
        this._dialog.open(RewardDialog, {
          data: {
            xp: 5,
            coins: 5,
            message: 'Tus datos de sueño han sido sincronizados con el sistema.'
          } as RewardData,
          panelClass: 'system-dialog-panel'
        });
      } else {
        this._snackbar.open('No se han podido guardar los datos.', 'OK', { duration: 3000 });
      }
    } catch (error) {
      this._snackbar.open('Error crítico de red.', 'OK', { duration: 3000 });
    } finally {
      // this.dialogRef.close(); // Moved inside success check to avoid closing before reward dialog if we want to chain them or just handle it there.
      // If error, we might want to keep it open or close it. 
      // Usually, if it's finally, we close. But I'll close it inside success and keep it for error for now.
      if (this.updateStatus()?.status !== 'success') {
        this.dialogRef.close();
      }
    }
  }

}
