import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
// Material
import { MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { SleepDialog } from './sleep-dialog';
import { SleepRepository } from 'src/app/data/repositories/sleep';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BodyCompositionDialog } from './body-composition-dialog';

@Component({
  selector: 'app-dashboardsheet',
  imports: [MatListModule],
  template: `
    <mat-nav-list>
      <a mat-list-item (click)="openLink($event, 'sleep')">
        <span matListItemTitle>Sueño</span>
        <span matLine>Logea tus horas de sueño.</span>
      </a>

      <a mat-list-item (click)="openLink($event, 'body')">
        <span matListItemTitle>Composición Corporal</span>
        <span matLine>Logea tu peso, grasa y musculo.</span>
      </a>

      <a mat-list-item (click)="openLink($event, 'measures')">
        <span matListItemTitle>Medidas</span>
        <span matLine>Logea tus medidas corporales.</span>
      </a>

      <a mat-list-item (click)="openLink($event, 'photos')">
        <span matListItemTitle>Fotos</span>
        <span matLine>Una imagen vale más que mil palabras.</span>
      </a>

    </mat-nav-list>    
  `,
  styles: `
    .sleep-dialog {
      background-color: #050505 !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,

})
export class Dashboardsheet {
  private readonly bottomSheetRef = inject(MatBottomSheetRef<Dashboardsheet>);
  private readonly sleepRepository = inject(SleepRepository);
  private readonly _snackbar = inject(MatSnackBar);
  dialog = inject(MatDialog)

  async openLink(event: MouseEvent, dialog: string) {
    event.preventDefault();

    switch (dialog) {
      case 'sleep':

        const alreadyRegistered = await this.sleepRepository.isDataAvailable();
        if (alreadyRegistered) {
          this._snackbar.open('Ya tienes un registro de sueño para el dia de hoy', 'OK', {
            duration: 3000
          });
          this.bottomSheetRef.dismiss();
          return;
        }

        this.dialog.open(SleepDialog, {
          autoFocus: false,
          panelClass: 'sleep-dialog'
        });
        this.bottomSheetRef.dismiss();
        break;
      case 'body':
        this.dialog.open(BodyCompositionDialog, {
          autoFocus: false,
          panelClass: 'body-composition-dialog'
        });
        this.bottomSheetRef.dismiss();
        break;
      case 'measures':
        break;
      case 'photos':
        break;
    }
  }
}
