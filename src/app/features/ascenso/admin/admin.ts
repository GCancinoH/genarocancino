import { ChangeDetectionStrategy, Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
// Material
import { MatCardModule } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
// UI
import { Header } from '@features/ui/header/header';
import { MatSpacer } from '@features/ui/spacer/spacer';
import { MatFlex } from '@features/ui/flex/flex';
// Backend & Components
import { AdminRepository, PlayerRecord } from 'src/app/data/repositories/admin';
import { NewPlayerDialog } from './new-player-dialog';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    Header, MatCardModule, MatButton, MatIcon, MatSpacer, MatFlex, RouterLink
  ],
  template: `
    <div class="admin-wrapper">
      <gc-header useWhen="dashboard" />

      <div class="admin-content-container">
        <!-- System Control Header -->
        <div class="system-header">
            <div class="header-line"></div>
            <span class="header-text">[ SYSTEM ADMINISTRATION: USER CONTROLS ]</span>
            <div class="header-line"></div>
        </div>

        <!-- Action Bar -->
        <div class="action-bar">
          <button class="action-btn text-blue" (click)="openNewPlayerDialog()">
            <span class="btn-bracket">[</span>
            <mat-icon class="icon-inline">person_add</mat-icon>
            REGISTRAR NUEVO JUGADOR
            <span class="btn-bracket">]</span>
          </button>
          
          <mat-spacer></mat-spacer>

          <button class="action-btn text-gray" (click)="goBack()">
            <span class="btn-bracket">[</span>
            <mat-icon class="icon-inline">arrow_back</mat-icon>
            VOLVER AL SISTEMA
            <span class="btn-bracket">]</span>
          </button>
        </div>

        <mat-spacer height="24" />

        <!-- Loading State -->
        @if (loading()) {
          <div class="loading-terminal">
            <div class="terminal-loader">
              <span class="cursor">></span> CARGANDO REGISTROS DEL SISTEMA...
            </div>
          </div>
        } @else if (error()) {
          <!-- Error State -->
          <div class="error-terminal">
            <mat-icon class="error-icon">warning</mat-icon>
            <div class="error-message">ERROR DE ACCESO: {{ error() }}</div>
            <button class="action-btn text-red" (click)="loadPlayers()">
              <span class="btn-bracket">[</span> REINTENTAR CONEXIÓN <span class="btn-bracket">]</span>
            </button>
          </div>
        } @else {
          <!-- Card List of Players -->
          <div class="players-grid">
            @for (player of players(); track player.uid) {
              <mat-card class="player-card">
                <div class="card-glow"></div>
                <mat-card-header class="player-card-header">
                  <div class="player-avatar">
                    <mat-icon>sports_handball</mat-icon>
                  </div>
                  <div class="player-title-info">
                    <div class="player-name">{{ player.displayName || 'SIN NOMBRE' }}</div>
                    <div class="player-email">{{ player.email }}</div>
                  </div>
                </mat-card-header>

                <mat-card-content class="player-card-content">
                  <div class="meta-row">
                    <span class="meta-label">IDENTIFICADOR DE USUARIO</span>
                    <span class="meta-value font-code">{{ player.uid.slice(0, 12) }}...</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-label">EDAD REGISTRADA</span>
                    <span class="meta-value">{{ player.customClaims?.age || 'N/A' }} AÑOS</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-label">ESTADO DE CUENTA</span>
                    <span class="meta-value active-badge">
                      {{ player.disabled ? 'DESACTIVADO' : 'SISTEMA ACTIVO' }}
                    </span>
                  </div>
                </mat-card-content>

                <div class="player-card-footer">
                  <div class="claims-badges">
                    <span class="badge role-badge">PLAYER</span>
                    @if (player.customClaims?.premiumAccount) {
                      <span class="badge premium-badge">PREMIUM</span>
                    }
                  </div>
                  <button class="edit-player-btn" (click)="editPlayer(player.uid)">
                    <mat-icon class="icon-inline">edit</mat-icon>
                    <span>EDITAR</span>
                  </button>
                </div>
              </mat-card>
            } @empty {
              <div class="empty-terminal">
                <mat-icon>folder_open</mat-icon>
                <div>NO SE ENCONTRARON JUGADORES CON ROL ACTIVO EN EL SISTEMA.</div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .admin-wrapper {
      min-height: 100vh;
      background: #000;
      color: #fff;
      font-family: 'Inter', sans-serif;
    }

    .admin-content-container {
      padding: 30px 40px;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* System Cyber Header */
    .system-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 30px;
    }

    .header-line {
      flex-grow: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, #2575fc, transparent);
    }

    .header-text {
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 3px;
      color: #2575fc;
      text-shadow: 0 0 10px rgba(37, 117, 252, 0.5);
    }

    /* Action Bar styling */
    .action-bar {
      display: flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 12px 20px;
      border-radius: 8px;
    }

    .action-btn {
      background: transparent;
      border: none;
      font-weight: 800;
      letter-spacing: 2px;
      cursor: pointer;
      padding: 10px 16px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
    }

    .icon-inline {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
    }

    .text-blue {
      color: #2575fc;
    }

    .text-gray {
      color: rgba(255, 255, 255, 0.5);
    }

    .text-red {
      color: #ff3366;
    }

    .action-btn:hover {
      color: white !important;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.6);
    }

    .btn-bracket {
      font-size: 1.1rem;
      transition: transform 0.2s ease;
    }

    .action-btn:hover .btn-bracket:first-child {
      transform: translateX(-4px);
    }

    .action-btn:hover .btn-bracket:last-child {
      transform: translateX(4px);
    }

    /* Terminals & Loading */
    .loading-terminal, .error-terminal, .empty-terminal {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      background: rgba(5, 5, 5, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      text-align: center;
    }

    .terminal-loader {
      font-family: 'Courier New', Courier, monospace;
      font-size: 1rem;
      color: #2575fc;
      text-shadow: 0 0 8px rgba(37, 117, 252, 0.4);
    }

    .cursor {
      animation: blink 1s infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 0; }
      50% { opacity: 1; }
    }

    .error-icon {
      font-size: 48px !important;
      width: 48px !important;
      height: 48px !important;
      color: #ff3366;
      margin-bottom: 16px;
    }

    .error-message {
      font-family: 'Courier New', Courier, monospace;
      color: #ff3366;
      margin-bottom: 24px;
    }

    .empty-terminal mat-icon {
      font-size: 48px !important;
      width: 48px !important;
      height: 48px !important;
      color: rgba(255, 255, 255, 0.2);
      margin-bottom: 16px;
    }

    .empty-terminal div {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.4);
      letter-spacing: 1px;
    }

    /* Players Grid & Cards (Body Composition Styled) */
    .players-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
    }

    .player-card {
      background: rgba(5, 5, 5, 0.98) !important;
      border: 2px solid rgba(37, 117, 252, 0.15) !important;
      border-radius: 0 !important; /* Cyber square style */
      padding: 16px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 15px rgba(37, 117, 252, 0.05);
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    .player-card:hover {
      border-color: rgba(37, 117, 252, 0.5) !important;
      box-shadow: 0 0 30px rgba(37, 117, 252, 0.15);
      transform: translateY(-4px);
    }

    .card-glow {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, #2575fc, transparent);
      opacity: 0.7;
    }

    .player-card-header {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 16px;
    }

    .player-avatar {
      background: rgba(37, 117, 252, 0.1);
      border: 1px solid rgba(37, 117, 252, 0.3);
      width: 42px;
      height: 42px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .player-avatar mat-icon {
      color: #2575fc;
      font-size: 24px;
      width: 24px;
      height: 24px;
      filter: drop-shadow(0 0 4px rgba(37, 117, 252, 0.5));
    }

    .player-title-info {
      display: flex;
      flex-direction: column;
    }

    .player-name {
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: #fff;
    }

    .player-email {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.45);
    }

    .player-card-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
    }

    .meta-label {
      color: rgba(255, 255, 255, 0.4);
      font-weight: 700;
      letter-spacing: 1px;
    }

    .meta-value {
      color: #fff;
      font-weight: 600;
    }

    .font-code {
      font-family: 'Courier New', Courier, monospace;
      color: rgba(255, 255, 255, 0.7);
    }

    .active-badge {
      color: #00ff66;
      text-shadow: 0 0 5px rgba(0, 255, 102, 0.3);
    }

    .player-card-footer {
      margin-top: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .claims-badges {
      display: flex;
      gap: 8px;
    }

    .edit-player-btn {
      background: transparent;
      border: 1px solid rgba(37, 117, 252, 0.2);
      color: #2575fc;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 6px 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.7rem;
      border-radius: 2px;
    }

    .edit-player-btn:hover {
      border-color: #2575fc;
      background: rgba(37, 117, 252, 0.1);
      box-shadow: 0 0 10px rgba(37, 117, 252, 0.2);
    }

    .badge {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 1px;
      padding: 3px 8px;
      border-radius: 3px;
    }

    .role-badge {
      background: rgba(37, 117, 252, 0.1);
      border: 1px solid rgba(37, 117, 252, 0.4);
      color: #2575fc;
    }

    .premium-badge {
      background: rgba(255, 170, 0, 0.1);
      border: 1px solid rgba(255, 170, 0, 0.4);
      color: rgb(255, 170, 0);
    }

    /* Responsiveness */
    @media (max-width: 768px) {
      .admin-content-container {
        padding: 20px;
      }
      .action-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }
      .action-bar mat-spacer {
        display: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent implements OnInit, OnDestroy {
  private readonly adminRepository = inject(AdminRepository);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private playersSubscription?: Subscription;

  // signals
  players = signal<PlayerRecord[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadPlayers();
  }

  loadPlayers() {
    this.loading.set(true);
    this.error.set(null);

    this.playersSubscription?.unsubscribe();
    this.playersSubscription = this.adminRepository.getPlayers().subscribe((res) => {
      this.loading.set(false);

      if (res.status === 'success' && res.data) {
        this.players.set(res.data);
      } else if (res.status === 'error') {
        this.error.set(res.message || 'Fallo de autenticación o conexión con la central.');
      } else {
        this.error.set('Fallo de autenticación o conexión con la central.');
      }
    });
  }

  ngOnDestroy() {
    this.playersSubscription?.unsubscribe();
  }

  openNewPlayerDialog() {
    this.dialog.open(NewPlayerDialog, {
      width: '500px',
      disableClose: true
    });
  }

  editPlayer(uid: string) {
    this.router.navigate(['/ascenso/admin/player-edit', uid]);
  }

  goBack() {
    this.location.back();
  }
}
