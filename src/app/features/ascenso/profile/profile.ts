import { Component, inject, computed, ChangeDetectionStrategy, effect, signal } from '@angular/core';
import { PlayerRepository } from 'src/app/data/repositories/player';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { resource, Resource } from '@data/models/resource';

@Component({
  selector: 'app-profile',
  imports: [MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, FormsModule, MatSnackBarModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Profile {
  private readonly playerRepository = inject(PlayerRepository);
  private readonly _snackBar = inject(MatSnackBar);
  public readonly location = inject(Location);
  
  // signals
  updateStatus = signal<Resource<void> | null>(null);
  
  initials = computed(() => {
    const name = this.player()?.displayName;
    if (!name) return '??';
    return name.split(' ')
      .map((part: string) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });
  player = computed(() => this.playerRepository.getPlayer());
  
  // variables
  editableDisplayName = '';

  constructor() {
    effect(() => {
      const p = this.player();
      if (p && !this.editableDisplayName) {
        this.editableDisplayName = p.displayName || '';
      }
    });
  }

  goBack() {
    this.location.back();
  }

  async updateProfile() {
    this.updateStatus.set(resource.loading());
    
    const result = await this.playerRepository.updatePlayerProfile({
      displayName: this.editableDisplayName,
      photoURL: this.player()?.photoURL || null
    });

    this.updateStatus.set(result);

    if (result.status === 'success') {
      this._snackBar.open('Perfil actualizado exitosamente', 'Cerrar', { duration: 3000 });
      // Reset status after a while
      setTimeout(() => this.updateStatus.set(null), 3000);
    } else if (result.status === 'error') {
      this._snackBar.open(`Error: ${result.message}`, 'Cerrar', { duration: 5000 });
    }
  }
}
