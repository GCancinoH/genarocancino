import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
// Material
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButton, MatFabButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDrawer, MatDrawerContainer, MatDrawerContent } from '@angular/material/sidenav';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';
// UI
import { Header } from '@features/ui/header/header';
import { MatSpacer } from '@features/ui/spacer/spacer';
// Repositories
import { PlayerRepository } from 'src/app/data/repositories/player';
import { Dashboardsheet } from './sheet/dashboardsheet';
import { MatFlex } from '@features/ui/flex/flex';

@Component({
  selector: 'app-dashboard',
  imports: [
    Header, MatButton, MatFabButton, MatIcon, MatCardModule, MatDrawer, MatDrawerContainer, MatDrawerContent,
    MatSpacer, MatFlex, MatDivider, RouterLink
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  // injects
  private readonly playerRepository = inject(PlayerRepository);
  private readonly bottomSheet = inject(MatBottomSheet);
  // signals
  showDrawer = signal(false);
  //player = this.playerRepository.getPlayer();
  playerRewardsSignal = this.playerRepository.getPlayerRewardsSignal();
  playerRewards = this.playerRepository.getPlayerRewards();
  // computed
  readonly player = computed(() => this.playerRepository.getPlayer());
  readonly name = computed(() => {
    let playerName = this.player()?.displayName || '';
    playerName = playerName.split(' ')[0];
    return playerName;
  });

  initials = computed(() => {
    const name = this.player()?.displayName;
    if (!name) return '??';
    return name.split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  openDashboardSheet() {
    this.bottomSheet.open(Dashboardsheet);
  }
}