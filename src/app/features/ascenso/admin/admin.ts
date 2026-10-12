import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
// Material
import { MatIcon } from '@angular/material/icon';
// UI
import { Header } from '@features/ui/header/header';

interface AdminNavItem {
  label: string;
  icon: string;
  route: string;
  exact: boolean;
}

/**
 * Layout del panel del nutriólogo.
 *
 * Antes esta clase era la página de listado de jugadores; ahora es el shell:
 * header + sidebar + <router-outlet>. Cada sección es una ruta hija lazy
 * (`dashboard`, `pacientes`, `pacientes/:uid`, `agenda`, `plantillas`).
 *
 * El acceso lo protege `adminGuard` (claim `role === 'admin'`) y las
 * `firestore.rules`.
 */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [Header, MatIcon, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="admin-wrapper">
      <gc-header useWhen="dashboard" />

      <button
        class="drawer-toggle"
        type="button"
        aria-label="Abrir menú de navegación"
        (click)="toggleDrawer()"
      >
        <mat-icon>menu</mat-icon>
      </button>

      <aside class="sidebar" [class.open]="drawerOpen()">
        <div class="sidebar-header">
          <span class="sidebar-title">[ PANEL ]</span>
          <span class="sidebar-subtitle">NUTRIOLOGÍA</span>
        </div>

        <nav class="sidebar-nav">
          @for (item of navItems; track item.route) {
            <a
              class="nav-item"
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              (click)="closeDrawer()"
            >
              <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <span class="footer-dot"></span>
          <span class="footer-text">SESIÓN SEGURA</span>
        </div>
      </aside>

      @if (drawerOpen()) {
        <div class="drawer-backdrop" (click)="closeDrawer()"></div>
      }

      <main class="admin-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .admin-wrapper {
      min-height: 100vh;
      background: #000;
      color: #fff;
      font-family: 'Inter', sans-serif;
      display: flex;
      flex-direction: column;
    }

    /* ---------------- Sidebar ---------------- */
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 240px;
      background: rgba(5, 5, 5, 0.98);
      border-right: 1px solid rgba(37, 117, 252, 0.15);
      display: flex;
      flex-direction: column;
      padding: 24px 0;
      z-index: 40;
    }

    .sidebar-header {
      padding: 0 24px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      margin-bottom: 20px;
    }

    .sidebar-title {
      display: block;
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: 3px;
      color: #2575fc;
      text-shadow: 0 0 10px rgba(37, 117, 252, 0.5);
    }

    .sidebar-subtitle {
      display: block;
      margin-top: 4px;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 2px;
      color: rgba(255, 255, 255, 0.35);
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 0 12px;
      flex-grow: 1;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-left: 2px solid transparent;
      color: rgba(255, 255, 255, 0.55);
      text-decoration: none;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 2px;
      transition: all 0.2s ease;
    }

    .nav-item:hover {
      color: #fff;
      background: rgba(37, 117, 252, 0.06);
      border-left-color: rgba(37, 117, 252, 0.4);
    }

    .nav-item.active {
      color: #fff;
      background: rgba(37, 117, 252, 0.12);
      border-left-color: #2575fc;
      text-shadow: 0 0 10px rgba(37, 117, 252, 0.5);
    }

    .nav-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
    }

    .sidebar-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 20px;
    }

    .footer-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #00ff66;
      box-shadow: 0 0 8px rgba(0, 255, 102, 0.8);
    }

    .footer-text {
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.6rem;
      letter-spacing: 2px;
      color: rgba(255, 255, 255, 0.3);
    }

    /* ---------------- Contenido ---------------- */
    .admin-content {
      margin-left: 240px;
      flex-grow: 1;
      min-width: 0;
    }

    .drawer-toggle {
      display: none;
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 60;
      background: rgba(5, 5, 5, 0.9);
      border: 1px solid rgba(37, 117, 252, 0.3);
      color: #2575fc;
      border-radius: 4px;
      width: 40px;
      height: 40px;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 30;
      display: none;
    }

    /* ---------------- Responsivo ---------------- */
    @media (max-width: 1024px) {
      .drawer-toggle {
        display: flex;
      }

      .sidebar {
        transform: translateX(-100%);
        transition: transform 0.25s ease;
      }

      .sidebar.open {
        transform: translateX(0);
      }

      .admin-content {
        margin-left: 0;
      }

      .drawer-backdrop {
        display: block;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
  // Navigation model (Fase 4 activará 'plantillas')
  readonly navItems: AdminNavItem[] = [
    { label: 'DASHBOARD', icon: 'dashboard', route: '/ascenso/admin', exact: true },
    { label: 'PACIENTES', icon: 'group', route: '/ascenso/admin/pacientes', exact: false },
    { label: 'AGENDA', icon: 'calendar_month', route: '/ascenso/admin/agenda', exact: true },
  ];

  // Drawer (móvil)
  readonly drawerOpen = signal<boolean>(false);

  toggleDrawer() {
    this.drawerOpen.update((open) => !open);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
  }
}
