import {
  Component,
  inject,
  signal,
  computed,
  DestroyRef,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
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
    Header,
    MatButton,
    MatFabButton,
    MatIcon,
    MatCardModule,
    MatDrawer,
    MatDrawerContainer,
    MatDrawerContent,
    MatSpacer,
    MatFlex,
    MatDivider,
    RouterLink,
  ],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard.css',
})
export class Dashboard {
  // injects
  private readonly playerRepository = inject(PlayerRepository);
  private readonly bottomSheet = inject(MatBottomSheet);
  // signals
  showDrawer = signal(false);
  customClaims = signal<any>(null);
  //player = this.playerRepository.getPlayer();
  readonly playerRewardsState = this.playerRepository.playerRewards;
  // computed
  readonly player = computed(() => this.playerRepository.getPlayer());

  /**
   * El rol vive en el custom claim `role === 'admin'` (misma fuente de
   * verdad que usa `adminGuard`, el backend Flask y las firestore.rules).
   * Se acepta también el claim booleano legado `admin: true` por si
   * alguna cuenta todavía lo arrastra.
   */
  readonly isAdmin = computed(() => {
    const claims = this.customClaims();
    return claims?.['role'] === 'admin' || claims?.['admin'] === true;
  });
  readonly name = computed(() => {
    let playerName = this.player()?.displayName || '';
    playerName = playerName.split(' ')[0];
    return playerName;
  });

  initials = computed(() => {
    const name = this.player()?.displayName;
    if (!name) return '??';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  constructor() {
    effect(() => {
      const user = this.player();
      if (user) {
        this.playerRepository.getPlayerCustomClaims().then((claims) => {
          this.customClaims.set(claims);
          console.log('User custom claims:', claims);
        });
      } else {
        this.customClaims.set(null);
      }
    });
  }

  openDashboardSheet() {
    this.bottomSheet.open(Dashboardsheet);
  }

  logout(): void {
    this.playerRepository.signOut();
  }
}
