import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
// Material
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
// UI
import { PatientIntakeComponent } from '@features/ascenso/admin/pacientes/patient-intake';
import { CredentialsDialog } from '@features/ascenso/admin/pacientes/credentials-dialog';
import { ConnectivityService } from '@data/services/connectivity';
import { PatientProfile } from '@data/models/patient/patient-profile';
import { PatientsRepository, CreatePatientResult } from '@data/repositories/patients';
import { normalizePhone, waLink, welcomeMessage } from '@data/services/whatsapp';

/**
 * Listado de pacientes (Fase 1).
 *
 * Offline-first: la lista se sirve del espejo local de IndexedDB y de la
 * caché persistente de Firestore, así que se ve completa sin conexión.
 */
@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [
    FormField,
    UpperCasePipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIcon,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  template: `
    <div class="section-container">
      <!-- Barra superior: estado + alta -->
      <div class="top-bar">
        <div class="sync-status" [class.offline]="!connectivity.online()">
          <mat-icon class="sync-icon">
            {{ connectivity.inSync() ? 'cloud_done' : connectivity.online() ? 'sync' : 'cloud_off' }}
          </mat-icon>
          <span>{{ connectivity.statusLabel() }}</span>
        </div>

        <button class="action-btn text-blue" (click)="openIntake()">
          <span class="btn-bracket">[</span>
          <mat-icon class="icon-inline">person_add</mat-icon>
          NUEVO PACIENTE
          <span class="btn-bracket">]</span>
        </button>
      </div>

      @if (patients.drafts().length) {
        <div class="drafts-banner">
          <mat-icon>schedule</mat-icon>
          <span>
            {{ patients.drafts().length }} BORRADOR(S) PENDIENTE(S) DE CREAR.
            Se completarán solos al volver la señal.
          </span>
          <button class="retry-btn" (click)="retryDrafts()">REINTENTAR YA</button>
        </div>
      }

      <!-- Buscador y filtros -->
      <div class="filters">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>BUSCAR</mat-label>
          <input
            matInput
            type="search"
            [formField]="searchField"
            placeholder="Nombre, correo o tag"
          />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="tag-field">
          <mat-label>ETIQUETA</mat-label>
          <mat-select [formField]="tagField">
            <mat-option [value]="null">TODAS</mat-option>
            @for (tag of patients.availableTags(); track tag) {
              <mat-option [value]="tag">{{ tag | uppercase }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-button-toggle-group
          [formField]="sortField"
          class="sort-group"
          aria-label="Ordenar pacientes"
        >
          <mat-button-toggle value="recent">RECIENTES</mat-button-toggle>
          <mat-button-toggle value="name">A-Z</mat-button-toggle>
        </mat-button-toggle-group>

        <button
          type="button"
          class="toggle-switch"
          [class.on]="patients.showArchived()"
          role="switch"
          [attr.aria-checked]="patients.showArchived()"
          (click)="patients.showArchived.update((v) => !v)"
          title="Mostrar pacientes archivados"
        >
          <span class="knob"></span>
        </button>
      </div>

      <div class="result-count">
        {{ patients.filteredPatients().length }} DE {{ patients.patients().length }} PACIENTE(S)
      </div>

      @if (patients.status() === 'loading' && !patients.patients().length) {
        <div class="loading-terminal">
          <div class="terminal-loader">
            <span class="cursor">></span> CARGANDO EXPEDIENTES...
          </div>
        </div>
      } @else if (patients.error() && !patients.patients().length) {
        <div class="error-terminal">
          <mat-icon class="error-icon">warning</mat-icon>
          <div class="error-message">ERROR: {{ patients.error() }}</div>
        </div>
      } @else {
        <div class="patients-grid">
          @for (patient of patients.filteredPatients(); track patient.uid) {
            <article class="patient-card" (click)="openPatient(patient.uid)">
              <div class="card-glow"></div>

              <div class="card-header">
                <div class="avatar">{{ initials(patient) }}</div>
                <div class="title-info">
                  <div class="patient-name">{{ patient.displayName || 'SIN NOMBRE' }}</div>
                  <div class="patient-email">{{ patient.email || 'SIN CORREO' }}</div>
                </div>
                @if (patient.archived) {
                  <span class="badge archived-badge">ARCHIVADO</span>
                }
                @if (patient.phone) {
                  <button
                    type="button"
                    class="wa-btn"
                    title="Enviar bienvenida por WhatsApp"
                    aria-label="Enviar bienvenida por WhatsApp"
                    (click)="openWhatsApp(patient, $event)"
                  >
                    <mat-icon>chat</mat-icon>
                  </button>
                }
              </div>

              <div class="card-content">
                <div class="meta-row">
                  <span class="meta-label">EDAD</span>
                  <span class="meta-value">{{ patient.age ?? '—' }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">OBJETIVO</span>
                  <span class="meta-value goal">{{ goalLabel(patient) }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">ÚLTIMO CONTACTO</span>
                  <span class="meta-value">{{ lastContact(patient) }}</span>
                </div>
              </div>

              @if (patient.tags?.length) {
                <div class="tags">
                  @for (tag of patient.tags; track tag) {
                    <span class="tag">{{ tag }}</span>
                  }
                </div>
              }

              <div class="card-footer">
                <span class="reminder" [class.active]="patient.foodRecord24h?.enabled">
                  <mat-icon>restaurant_menu</mat-icon>
                  {{ patient.foodRecord24h?.enabled ? 'REGISTRO 24H' : 'SIN REGISTRO 24H' }}
                </span>
                <span class="open-link">
                  EXPEDIENTE <mat-icon>arrow_forward</mat-icon>
                </span>
              </div>
            </article>
          } @empty {
            <div class="empty-terminal">
              <mat-icon>folder_open</mat-icon>
              <div>
                {{ patients.patients().length ? 'NINGÚN PACIENTE COINCIDE CON EL FILTRO.' : 'AÚN NO HAY PACIENTES. REGISTRA EL PRIMERO.' }}
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .section-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* ---------- Barra superior ---------- */
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 10px 14px;
      border-radius: 8px;
    }

    .sync-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.68rem;
      letter-spacing: 1px;
      color: #00ff66;
      text-shadow: 0 0 6px rgba(0, 255, 102, 0.3);
    }

    .sync-status.offline {
      color: rgb(255, 170, 0);
      text-shadow: 0 0 6px rgba(255, 170, 0, 0.3);
    }

    .sync-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
    }

    .action-btn {
      background: transparent;
      border: none;
      font-family: inherit;
      font-weight: 800;
      letter-spacing: 2px;
      cursor: pointer;
      padding: 10px 12px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
    }

    .text-blue {
      color: #2575fc;
    }

    .action-btn:hover {
      color: white !important;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.6);
    }

    .icon-inline {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
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

    /*
     * Material pinta el valor del input en gris. Aquí se fuerza blanco
     * para que el texto sea legible al escribir.
     */
    :host ::ng-deep .section-container .mat-mdc-form-field input.mat-mdc-input-element,
    :host ::ng-deep .section-container .mat-mdc-select-value,
    :host ::ng-deep .section-container .mat-mdc-select-min-line {
      color: #fff;
    }

    :host ::ng-deep .section-container .mat-mdc-form-field input.mat-mdc-input-element::placeholder {
      color: rgba(255, 255, 255, 0.35);
    }

    /* ---------- Borradores ---------- */
    .drafts-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 12px;
      padding: 12px 14px;
      border: 1px solid rgba(255, 170, 0, 0.4);
      background: rgba(255, 170, 0, 0.07);
      border-radius: 4px;
      color: rgb(255, 170, 0);
      font-size: 0.68rem;
      letter-spacing: 1px;
      line-height: 1.6;
    }

    .retry-btn {
      margin-left: auto;
      flex-shrink: 0;
      background: transparent;
      border: 1px solid rgba(255, 170, 0, 0.5);
      color: rgb(255, 170, 0);
      font-family: inherit;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 1px;
      padding: 6px 10px;
      border-radius: 3px;
      cursor: pointer;
    }

    /* ---------- Filtros ---------- */
    .filters {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 16px;
    }

    /* Ancho acotado para que la fila de filtros no se vea apretada. */
    .search-field {
      flex: 0 1 260px;
      min-width: 170px;
      max-width: 280px;
    }

    .tag-field {
      flex: 0 0 160px;
      min-width: 140px;
    }

    .sort-group {
      flex-shrink: 0;
    }

    .toggle-switch {
      position: relative;
      width: 46px;
      height: 26px;
      flex-shrink: 0;
      border-radius: 13px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.06);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .toggle-switch.on {
      background: rgba(37, 117, 252, 0.3);
      border-color: #2575fc;
    }

    .toggle-switch .knob {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.7);
      transition: transform 0.2s ease;
    }

    .toggle-switch.on .knob {
      transform: translateX(20px);
      background: #fff;
      box-shadow: 0 0 8px rgba(37, 117, 252, 0.8);
    }

    .result-count {
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.62rem;
      letter-spacing: 2px;
      color: rgba(255, 255, 255, 0.35);
      margin: 14px 0 10px;
    }

    /* ---------- Terminales ---------- */
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

    .error-icon, .empty-terminal mat-icon {
      font-size: 48px !important;
      width: 48px !important;
      height: 48px !important;
      margin-bottom: 16px;
    }

    .error-icon {
      color: #ff3366;
    }

    .error-message {
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.85rem;
      color: #ff3366;
    }

    .empty-terminal mat-icon {
      color: rgba(255, 255, 255, 0.2);
    }

    .empty-terminal div {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.4);
      letter-spacing: 1px;
    }

    /* ---------- Grid ---------- */
    .patients-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .patient-card {
      position: relative;
      overflow: hidden;
      background: rgba(5, 5, 5, 0.98);
      border: 2px solid rgba(37, 117, 252, 0.15);
      padding: 16px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    .patient-card:hover {
      border-color: rgba(37, 117, 252, 0.5);
      box-shadow: 0 0 24px rgba(37, 117, 252, 0.15);
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

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }

    .avatar {
      flex-shrink: 0;
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(37, 117, 252, 0.1);
      border: 1px solid rgba(37, 117, 252, 0.3);
      border-radius: 4px;
      color: #2575fc;
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 1px;
      filter: drop-shadow(0 0 4px rgba(37, 117, 252, 0.5));
    }

    .title-info {
      flex: 1;
      min-width: 0;
    }

    .patient-name {
      font-size: 0.92rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #fff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .patient-email {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.45);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .badge {
      flex-shrink: 0;
      font-size: 0.55rem;
      font-weight: 800;
      letter-spacing: 1px;
      padding: 3px 6px;
      border-radius: 3px;
    }

    .archived-badge {
      background: rgba(255, 51, 102, 0.1);
      border: 1px solid rgba(255, 51, 102, 0.4);
      color: #ff3366;
    }

    .wa-btn {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      padding: 0;
      background: rgba(37, 211, 102, 0.08);
      border: 1px solid rgba(37, 211, 102, 0.35);
      border-radius: 3px;
      color: #25d366;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .wa-btn:hover {
      background: rgba(37, 211, 102, 0.18);
      border-color: #25d366;
      box-shadow: 0 0 8px rgba(37, 211, 102, 0.35);
    }

    .wa-btn mat-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
    }

    .card-content {
      display: flex;
      flex-direction: column;
      gap: 7px;
      padding: 12px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.68rem;
      gap: 8px;
    }

    .meta-label {
      color: rgba(255, 255, 255, 0.4);
      font-weight: 700;
      letter-spacing: 1px;
      flex-shrink: 0;
    }

    .meta-value {
      color: #fff;
      font-weight: 600;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .meta-value.goal {
      color: #2575fc;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }

    .tag {
      font-size: 0.55rem;
      font-weight: 800;
      letter-spacing: 1px;
      padding: 3px 7px;
      border-radius: 3px;
      background: rgba(37, 117, 252, 0.1);
      border: 1px solid rgba(37, 117, 252, 0.4);
      color: #2575fc;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 14px;
      gap: 8px;
    }

    .reminder {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.55rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: rgba(255, 255, 255, 0.25);
    }

    .reminder.active {
      color: #00ff66;
    }

    .reminder mat-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
    }

    .open-link {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.58rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: rgba(255, 255, 255, 0.35);
    }

    .open-link mat-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
    }

    .patient-card:hover .open-link {
      color: #2575fc;
    }

    /* ---------- Móvil ---------- */
    @media (max-width: 768px) {
      .section-container {
        padding: 16px 12px;
      }

      .patients-grid {
        grid-template-columns: 1fr;
      }

      .filters {
        gap: 8px;
      }

      .search-field, .tag-field {
        flex: 1 1 100%;
        min-width: 0;
      }

      .sort-group {
        width: 100%;
      }

      .sort-group mat-button-toggle {
        flex: 1;
      }

      .drafts-banner {
        flex-wrap: wrap;
      }

      .retry-btn {
        margin-left: 0;
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PacientesComponent {
  protected readonly patients = inject(PatientsRepository);
  protected readonly connectivity = inject(ConnectivityService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  // Los filtros viven en el repositorio para que puedan reutilizarse.
  // En Angular 22, form() recibe un WritableSignal y devuelve el FieldTree.
  protected readonly searchField = form(this.patients.searchTerm);
  protected readonly tagField = form(this.patients.tagFilter);
  protected readonly sortField = form(this.patients.sortBy);

  ngOnInit(): void {
    this.patients.start();
  }

  protected openIntake(): void {
    this.dialog
      .open(PatientIntakeComponent, {
        width: '640px',
        maxWidth: '100vw',
        disableClose: true,
      })
      .afterClosed()
      .subscribe((result?: { status: string; data?: CreatePatientResult; phone?: string }) => {
        if (result?.status === 'created' && result.data) {
          this.dialog.open(CredentialsDialog, {
            data: { ...result.data, phone: result.phone },
            width: '460px',
            maxWidth: '100vw',
          });
        }
      });
  }

  /**
   * Abre WhatsApp con el mensaje de bienvenida precargado.
   *
   * No envía nada automáticamente: el enlace abre el chat y queda listo
   * para que el nutriólogo le dé a enviar.
   */
  protected openWhatsApp(patient: PatientProfile, event: Event): void {
    // La tarjeta navega al expediente; el botón no debe hacerlo.
    event.stopPropagation();

    const link = waLink(patient.phone, welcomeMessage(patient.displayName));
    if (!link) {
      this.snackBar.open(
        `No se pudo armar el enlace: "${patient.phone}" no es un número válido.`,
        'OK',
        { duration: 4000 }
      );
      return;
    }

    window.open(link, '_blank', 'noopener,noreferrer');
  }

  /** Teléfono ya normalizado, para mostrarlo junto al botón de WhatsApp. */
  protected waPhone(phone?: string | null): string | null {
    return normalizePhone(phone);
  }

  protected async retryDrafts(): Promise<void> {
    await this.patients.flushDrafts();
  }

  protected openPatient(uid: string): void {
    this.router.navigate(['/ascenso/admin/pacientes', uid]);
  }

  protected initials(patient: PatientProfile): string {
    const name = (patient.displayName ?? '').trim();
    if (!name) return '??';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected goalLabel(patient: PatientProfile): string {
    const goal = patient.objective?.goal;
    const label = GOAL_LABELS[goal ?? ''];
    return label ?? '—';
  }

  protected lastContact(patient: PatientProfile): string {
    const value = patient.lastContactAt ?? patient.createdAt;
    if (!value) return '—';

    const diffDays = Math.floor((Date.now() - value) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'HOY';
    if (diffDays === 1) return 'AYER';
    if (diffDays < 30) return `HACE ${diffDays} DÍAS`;
    if (diffDays < 365) return `HACE ${Math.floor(diffDays / 30)} MESES`;
    return `HACE ${Math.floor(diffDays / 365)} AÑO(S)`;
  }
}

const GOAL_LABELS: Record<string, string> = {
  'perdida-peso': 'PÉRDIDA DE PESO',
  'ganar-masa': 'GANAR MASA',
  recomposicion: 'RECOMPOSICIÓN',
  'salud-metabolica': 'SALUD METABÓLICA',
  'rendimiento-deportivo': 'RENDIMIENTO',
  mantenimiento: 'MANTENIMIENTO',
};
