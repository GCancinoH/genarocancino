import { Component, inject, computed, ChangeDetectionStrategy, effect } from '@angular/core';
import { PlayerRepository } from 'src/app/data/repositories/player';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { Player } from 'src/app/data/models/player/player';

@Component({
  selector: 'app-profile',
  imports: [MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Profile {
  private readonly playerRepository = inject(PlayerRepository);
  public readonly location = inject(Location);
  // signals
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

  updateProfile() {
    this.playerRepository.updatePlayerProfile({
      displayName: this.editableDisplayName,
    });
  }
}
