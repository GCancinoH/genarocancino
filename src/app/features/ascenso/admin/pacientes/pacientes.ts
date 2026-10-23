import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
// Material
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
// UI
import { ConnectivityService } from '@data/services/connectivity';
import { PatientProfile } from '@data/models/patient/patient-profile';
import { PatientsRepository } from '@data/repositories/patients';
import { waLink, welcomeMessage } from '@data/services/whatsapp';

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
    MatFormFieldModule,
    MatIcon,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PacientesComponent {
  protected readonly patients = inject(PatientsRepository);
  protected readonly connectivity = inject(ConnectivityService);
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

  /**
   * Navega al alta de paciente.
   *
   * Antes abría `PatientIntakeComponent` como diálogo y, en `afterClosed()`,
   * mostraba el diálogo de credenciales. Ahora el alta es la página
   * `pacientes/nuevo`, que abre ese diálogo y vuelve al listado por su cuenta.
   */
  protected newPatient(): void {
    void this.router.navigate(['/ascenso/admin/pacientes/nuevo']);
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

    if (!patient.phone) {
      this.snackBar.open(
        `${patient.displayName ?? 'Este paciente'} no tiene teléfono. Agrégalo desde el expediente.`,
        'ABRIR',
        { duration: 5000 }
      ).onAction().subscribe(() => this.openPatient(patient.uid));
      return;
    }

    const link = waLink(patient.phone, welcomeMessage(patient.displayName));
    if (!link) {
      this.snackBar.open(
        `"${patient.phone}" no es un número válido para WhatsApp. Usa lada internacional: +52 55 1234 5678.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }

    window.open(link, '_blank', 'noopener,noreferrer');
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
