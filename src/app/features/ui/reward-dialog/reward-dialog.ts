import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatFlex } from '@features/ui/flex/flex';
import { MatSpacer } from "../spacer/spacer";

export interface RewardData {
  xp: number;
  coins: number;
  message?: string;
}

@Component({
  selector: 'app-reward-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule, MatFlex, MatSpacer],
  templateUrl: './reward-dialog.html',
  styleUrl: './reward-dialog.css'
})
export class RewardDialog {
  readonly data = inject<RewardData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<RewardDialog>);

  close() {
    this.dialogRef.close();
  }
}
