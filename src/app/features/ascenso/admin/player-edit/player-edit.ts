import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
// Material
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
// UI
import { MatFlex } from '@features/ui/flex/flex';
import { FullWidthDirective } from '@features/ui/full-width/full-width.directive';
// Backend
import { AdminRepository, PlayerRecord } from 'src/app/data/repositories/admin';
import { MealDay, Meal } from 'src/app/data/models/player/meal-plan';
import { WorkoutDay, Exercise } from 'src/app/data/models/player/workout-plan';
import { waLink, welcomeMessage } from '@data/services/whatsapp';
import { ConfirmDeleteDialog } from '@features/ascenso/admin/pacientes/confirm-delete-dialog';
import { PatientsRepository } from '@data/repositories/patients';
import { PatientProfile } from '@data/models/patient/patient-profile';
import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  SEX_LABELS,
  calculateImc,
  classifyImc,
  formatDate,
  formatNumber,
} from '@data/models/patient/patient-labels';

@Component({
  selector: 'app-player-edit',
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatFlex,
    FullWidthDirective,
  ],
  templateUrl: './player-edit.html',
  styleUrl: './player-edit.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminRepository = inject(AdminRepository);
  private readonly patients = inject(PatientsRepository);
  private readonly location = inject(Location);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  // Route param
  uid = signal<string>('');
  // Loading state
  loading = signal(true);
  // Save state
  saving = signal(false);
  saveStatus = signal<'saving' | 'success' | 'error' | null>(null);
  saveMessage = signal('');
  // Selected tab
  selectedTab = signal(0);
  // ─── General Info ────────────────────────────────────────────────────
  playerData = signal<PlayerRecord & { age?: number } | null>(null);

  // ─── Expediente clínico ──────────────────────────────────────────────
  // Viene del espejo local / caché de Firestore (`players/{uid}`), que es
  // donde el stepper de alta escribe anamnesis, objetivo, actividad,
  // composición corporal y registro de 24 h. Es SOLO LECTURA por ahora.
  protected readonly clinical = computed<PatientProfile | undefined>(() =>
    this.patients.patientByUid(this.uid())
  );

  /** IMC de la captura inicial (peso kg / talla cm). */
  protected readonly clinicalImc = computed<number | null>(() => {
    const p = this.clinical();
    return p ? calculateImc(p.initialWeight, p.initialHeight) : null;
  });

  /** Clasificación OMS del IMC inicial. */
  protected readonly clinicalImcLabel = computed<string | null>(() =>
    classifyImc(this.clinicalImc())
  );

  /** Dato de captura inicial presente, o false si el expediente quedó vacío. */
  protected readonly hasClinicalData = computed<boolean>(() => {
    const p = this.clinical();
    if (!p) return false;
    return Boolean(
      p.anamnesis ||
      p.objective ||
      p.activity ||
      p.food ||
      p.bodyComposition ||
      p.foodRecord24h ||
      p.initialWeight ||
      p.initialHeight
    );
  });

  // Chips (siempre arrays, para poder iterarlos sin guardas en el template)
  protected readonly clinicalTags = computed<string[]>(() => this.clinical()?.tags ?? []);
  protected readonly conditionChips = computed<string[]>(
    () => this.clinical()?.anamnesis?.conditions ?? []
  );
  protected readonly intoleranceChips = computed<string[]>(
    () => this.clinical()?.anamnesis?.intolerances ?? []
  );
  protected readonly likesChips = computed<string[]>(() => this.clinical()?.food?.likes ?? []);
  protected readonly dislikesChips = computed<string[]>(() => this.clinical()?.food?.dislikes ?? []);
  protected readonly restrictionChips = computed<string[]>(
    () => this.clinical()?.food?.restrictions ?? []
  );

  // Signal Form for general info
  playerForm = form(signal({
    displayName: '',
    email: '',
    phone: '',
    age: 0 as number,
  }));

  editDisabled = signal(false);
  editPremium = signal(false);

  // ─── Meal Plan ────────────────────────────────────────────────────────
  mealDays = signal<MealDay[]>([]);

  // ─── Workout Plan ─────────────────────────────────────────────────────
  workoutDays = signal<WorkoutDay[]>([]);

  ngOnInit() {
    // Arranca la suscripción offline-first a `players`: el espejo local y la
    // caché persistente de Firestore alimentan la pestaña clínica.
    this.patients.start();

    const uidParam = this.route.snapshot.paramMap.get('uid');
    if (!uidParam) {
      this.snackBar.open('ERROR: No se especificó un ID de jugador.', 'OK', { duration: 5000 });
      this.location.back();
      return;
    }

    this.uid.set(uidParam);
    this.loadPlayerData(uidParam);
  }

  private async loadPlayerData(uid: string) {
    this.loading.set(true);
    const result = await this.adminRepository.getPlayerById(uid);

    if (result.status === 'success' && result.data) {
      const player = result.data;
      this.playerData.set(player);
      this.playerForm.displayName().value.set(player.displayName || '');
      this.playerForm.email().value.set(player.email || '');
      this.playerForm.phone().value.set(player.phone || '');
      this.playerForm.age().value.set(player.age ?? 0);
      this.editDisabled.set(player.disabled);
      this.editPremium.set(player.customClaims?.premiumAccount ?? false);

      // Load meal plan from player doc (stored as field)
      if ((player as any).mealPlan?.days) {
        this.mealDays.set((player as any).mealPlan.days);
      }

      // Load workout plan from player doc (stored as field)
      if ((player as any).workoutPlan?.days) {
        this.workoutDays.set((player as any).workoutPlan.days);
      }
    } else if (result.status === 'error') {
      this.snackBar.open(
        result.message || 'Error al cargar los datos del jugador.',
        'OK',
        { duration: 5000 }
      );
      this.location.back();
    }

    this.loading.set(false);
  }

  goBack() {
    this.location.back();
  }

  // ─── Archivar / eliminar ─────────────────────────────────────────────

  /**
   * Estado del expediente en el espejo local. También serve de "listo":
   * hasta que no aparece, los botones de abajo están deshabilitados, para
   * no acabar escribiendo un `archived` sobre un documento que aún no se ha
   * leído.
   */
  protected readonly archived = computed<boolean>(() => this.clinical()?.archived ?? false);

  protected readonly archiveBusy = signal<boolean>(false);
  protected readonly deleting = signal<boolean>(false);

  /** Archivar (oculta del listado) o restaurar. Nunca borra nada. */
  protected async toggleArchive(): Promise<void> {
    const uid = this.uid();
    if (!uid || !this.clinical() || this.archiveBusy()) return;

    const next = !this.archived();
    this.archiveBusy.set(true);

    const result = await this.patients.setArchived(uid, next);
    this.archiveBusy.set(false);

    if (result.status === 'success') {
      this.snackBar.open(
        next ? 'Paciente archivado. El historial queda intacto.' : 'Paciente restaurado.',
        'OK',
        { duration: 3500 }
      );
      return;
    }

    this.snackBar.open(
      result.status === 'error' ? result.message : 'No se pudo archivar.',
      'OK',
      { duration: 5000 }
    );
  }

  /** Pide confirmación y borra expediente, datos relacionados y cuenta. */
  protected async confirmDelete(): Promise<void> {
    const uid = this.uid();
    const patient = this.clinical();
    if (!uid || !patient || this.deleting()) return;

    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDeleteDialog, {
          data: {
            patient: { uid, displayName: patient.displayName, email: patient.email },
          },
          width: '440px',
          maxWidth: '100vw',
          disableClose: true,
        })
        .afterClosed()
    );

    if (!confirmed) return;

    this.deleting.set(true);
    const result = await this.patients.deletePatient(uid);
    this.deleting.set(false);

    if (result.status === 'success') {
      this.snackBar.open('Paciente eliminado definitivamente.', 'OK', { duration: 4000 });
      // Vuelve al listado: ya no hay expediente al que volver.
      void this.router.navigate(['/ascenso/admin/pacientes']);
      return;
    }

    // El repositorio distingue entre "faltan datos" y "falta la cuenta", así
    // que el mensaje ya dice qué quedó pendiente.
    this.snackBar.open(
      result.status === 'error' ? result.message : 'No se pudo eliminar.',
      'OK',
      { duration: 9000 }
    );
  }

  /**
   * Abre WhatsApp con el mensaje de bienvenida precargado.
   * Nada se envía hasta que el nutriólogo pulsa enviar.
   */
  openWhatsApp(): void {
    const name = this.playerForm.displayName().value();
    const phone = this.playerForm.phone().value();
    const link = waLink(phone, welcomeMessage(name));

    if (!link) {
      this.snackBar.open(
        phone.trim()
          ? `"${phone}" no es un número válido para WhatsApp. Usa lada internacional: +52 55 1234 5678.`
          : 'Captura el teléfono antes de enviar el mensaje de bienvenida.',
        'OK',
        { duration: 6000 }
      );
      return;
    }

    window.open(link, '_blank', 'noopener,noreferrer');
  }

  // ─── Presentación del expediente clínico ──────────────────────────────
  protected goalLabel(goal?: PatientProfile['objective'] | string): string {
    const value = typeof goal === 'string' ? goal : goal?.goal;
    if (!value) return '—';
    return GOAL_LABELS[value as keyof typeof GOAL_LABELS] ?? value;
  }

  protected activityLabel(level?: string): string {
    if (!level) return '—';
    return ACTIVITY_LABELS[level as keyof typeof ACTIVITY_LABELS] ?? level;
  }

  protected sexLabel(sex?: string): string {
    if (!sex) return '—';
    return SEX_LABELS[sex as keyof typeof SEX_LABELS] ?? sex;
  }

  protected fmtDate(value?: string | null): string {
    return formatDate(value);
  }

  protected fmtNum(value?: number | null, suffix = ''): string {
    return formatNumber(value, suffix);
  }

  /** Une un array en texto; '—' si está vacío. */
  protected fmtList(items?: string[] | null): string {
    return items && items.length ? items.join(', ') : '—';
  }

  // ─── Toggle helpers ────────────────────────────────────────────────────
  /** Inverted signal for the "CUENTA ACTIVA" toggle — ON = active = !disabled */
  editActive = computed(() => !this.editDisabled());

  toggleActive() {
    this.editDisabled.set(!this.editDisabled());
  }

  // ─── Save All ──────────────────────────────────────────────────────────
  async saveAll() {
    const uid = this.uid();
    if (!uid) return;

    this.saving.set(true);
    this.saveStatus.set('saving');

    const formValues = this.playerForm().value() ?? {};
    const payload = {
      displayName: formValues.displayName || null,
      email: formValues.email || null,
      // Vacío => '' y NO null: firestore.rules valida phone con
      // isBoundedString, que solo acepta string (rechazaría null).
      // minLen es 0, así que '' pasa y además limpia el teléfono viejo.
      phone: formValues.phone?.trim() || '',
      age: formValues.age ?? null,
      disabled: this.editDisabled(),
      premiumAccount: this.editPremium(),
      mealPlan: { days: this.mealDays() },
      workoutPlan: { days: this.workoutDays() },
    };

    const result = await this.adminRepository.updatePlayer(uid, payload);

    if (result.status === 'success') {
      this.saveStatus.set('success');
      this.saveMessage.set('');
      this.snackBar.open('Cambios guardados exitosamente.', 'OK', { duration: 3000 });
      setTimeout(() => this.saveStatus.set(null), 3000);
    } else if (result.status === 'error') {
      this.saveStatus.set('error');
      this.saveMessage.set(result.message || 'Error al guardar');
      this.snackBar.open('Error al guardar los cambios.', 'OK', { duration: 5000 });
    }

    this.saving.set(false);
  }

  // ─── Meal Plan Methods ────────────────────────────────────────────────
  addMealDay() {
    const days = this.mealDays();
    const nextDay = days.length > 0 ? Math.max(...days.map(d => d.dia)) + 1 : 1;
    this.mealDays.update(d => [...d, { dia: nextDay, comidas: [] }]);
  }

  removeMealDay(index: number) {
    this.mealDays.update(d => d.filter((_, i) => i !== index));
  }

  addMeal(dayIndex: number) {
    const day = this.mealDays()[dayIndex];
    if (!day) return;
    const mealNum = day.comidas.length + 1;
    const newMeal: Meal = {
      nombre: `Comida #${mealNum}`,
      hora: '',
      descripcion: '',
      alimentos: '',
    };
    this.mealDays.update(days => {
      const updated = [...days];
      updated[dayIndex] = { ...updated[dayIndex], comidas: [...updated[dayIndex].comidas, newMeal] };
      return updated;
    });
  }

  removeMeal(dayIndex: number, mealIndex: number) {
    this.mealDays.update(days => {
      const updated = [...days];
      updated[dayIndex] = {
        ...updated[dayIndex],
        comidas: updated[dayIndex].comidas.filter((_, i) => i !== mealIndex),
      };
      return updated;
    });
  }

  /**
   * Decodes a small BBCode-style subset saved as plain text in Firestore.
   * Keep this intentionally narrow so admins can use simple tags without a WYSIWYG editor.
   */
  decodeMarkup(value: string | null | undefined): string {
    if (!value) return '';

    let html = this.escapeHtml(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    html = this.decodeListTag(html, 'sub-list', 'sub-list');
    html = this.decodeListTag(html, 'list');
    html = html
      .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>')
      .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>')
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, '<br>');

    return html;
  }

  private decodeListTag(html: string, tag: 'list' | 'sub-list', className = ''): string {
    const pattern = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'gi');
    return html.replace(pattern, (_, content: string) => {
      const items = content
        .split('\n')
        .map(item => item.trim().replace(/^[-*•]\s*/, ''))
        .filter(Boolean)
        .map(item => `<li>${item}</li>`)
        .join('');

      const classAttr = className ? ` class="${className}"` : '';
      return items ? `<ul${classAttr}>${items}</ul>` : '';
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── Workout Plan Methods ─────────────────────────────────────────────
  addWorkoutDay() {
    const days = this.workoutDays();
    const nextDay = days.length > 0 ? Math.max(...days.map(d => d.dia)) + 1 : 1;
    this.workoutDays.update(d => [...d, { dia: nextDay, ejercicios: [] }]);
  }

  removeWorkoutDay(index: number) {
    this.workoutDays.update(d => d.filter((_, i) => i !== index));
  }

  addExercise(dayIndex: number) {
    const day = this.workoutDays()[dayIndex];
    if (!day) return;
    const exNum = day.ejercicios.length + 1;
    const newExercise: Exercise = {
      nombre: `Ejercicio #${exNum}`,
      series: 4,
      repeticiones: '',
      descanso: '',
      notas: '',
    };
    this.workoutDays.update(days => {
      const updated = [...days];
      updated[dayIndex] = {
        ...updated[dayIndex],
        ejercicios: [...updated[dayIndex].ejercicios, newExercise],
      };
      return updated;
    });
  }

  removeExercise(dayIndex: number, exerciseIndex: number) {
    this.workoutDays.update(days => {
      const updated = [...days];
      updated[dayIndex] = {
        ...updated[dayIndex],
        ejercicios: updated[dayIndex].ejercicios.filter((_, i) => i !== exerciseIndex),
      };
      return updated;
    });
  }
}
