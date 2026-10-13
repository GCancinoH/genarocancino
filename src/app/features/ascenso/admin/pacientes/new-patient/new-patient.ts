import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormField, form, email, max, min, minLength, required } from '@angular/forms/signals';
import { Router } from '@angular/router';
// Material
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatProgressBarModule } from '@angular/material/progress-bar';
// UI & Data
import { ChipInput } from '@features/ui/chip-input/chip-input';
import { FullWidthDirective } from '@features/ui/full-width/full-width.directive';
import { CredentialsDialog } from '@features/ascenso/admin/pacientes/credentials-dialog';
import {
  ActivityLevel,
  PatientGoal,
  PatientProfile,
  Sex,
} from '@data/models/patient/patient-profile';
import {
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  SEX_OPTIONS,
  calculateImc,
  classifyImc,
} from '@data/models/patient/patient-labels';
import { PatientsRepository } from '@data/repositories/patients';
import { ConnectivityService } from '@data/services/connectivity';

const CONDITION_OPTIONS = [
  'Diabetes',
  'Hipertensión',
  'Hipotiroidismo',
  'Síndrome de ovario poliquístico',
  'Embarazo',
  'Lactancia',
  'Enfermedad celíaca',
  'Gastritis / reflujo',
  'Colesterol alto',
  'Ninguna',
];

const RESTRICTION_OPTIONS = [
  'Vegetariano',
  'Vegano',
  'Sin gluten',
  'Sin lactosa',
  'Halal',
  'Kosher',
  'Baja en sodio',
  'Baja en azúcar',
];

/**
 * Alta de paciente en 4 pasos.
 *
 * Ruta: `ascenso/admin/pacientes/nuevo`
 *
 * Paso 1  Datos de cuenta (los que necesita el backend para crear el usuario)
 * Paso 2  Antecedentes
 * Paso 3  Objetivo y actividad
 * Paso 4  Alimentos y registro alimentario de 24 h
 *
 * Antes vivía como diálogo (`PatientIntakeComponent`); ahora es una página
 * propia, porque un expediente de 4 pasos no cabe en 640 px y en móvil el
 * stepper se volvía inutilizable.
 *
 * Si no hay conexión, el alta se guarda como borrador en IndexedDB y se
 * completa sola al recuperar la señal (ver `PatientsRepository.flushDrafts`).
 */
@Component({
  selector: 'app-new-patient',
  standalone: true,
  imports: [
    FormField,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIcon,
    MatInputModule,
    MatSelectModule,
    MatStepperModule,
    MatProgressBarModule,
    ChipInput,
    FullWidthDirective,
  ],
  templateUrl: './new-patient.html',
  styleUrl: './new-patient.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewPatient {
  private readonly patients = inject(PatientsRepository);
  private readonly connectivity = inject(ConnectivityService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  private readonly stepper = viewChild<MatStepper>('stepper');

  protected readonly saving = signal<boolean>(false);
  protected readonly online = this.connectivity.online;

  protected readonly sexOptions = SEX_OPTIONS;

  protected readonly conditionOptions = CONDITION_OPTIONS;
  protected readonly restrictionOptions = RESTRICTION_OPTIONS;
  protected readonly activityOptions = ACTIVITY_OPTIONS;
  protected readonly goalOptions = GOAL_OPTIONS;

  /** Modelo vivo del formulario. */
  private readonly model = signal({
    // Paso 1 — cuenta
    nombre: '',
    edad: 18,
    fechaNacimiento: '',
    sexo: 'F' as Sex,
    correo: '',
    telefono: '',
    // Paso 2 — antecedentes
    condiciones: [] as string[],
    alergias: '',
    intolerancias: [] as string[],
    medicamentos: '',
    antecedentesFamiliares: '',
    cirugias: '',
    notasAntecedentes: '',
    // Paso 3 — objetivo y actividad
    objetivo: 'perdida-peso' as PatientGoal,
    pesoActual: 0,
    talla: 0,
    pesoMeta: 0,
    fechaMeta: '',
    expectativa: '',
    nivelActividad: 'sedentario' as ActivityLevel,
    tipoTrabajo: '',
    diasEjercicio: 0,
    tipoEjercicio: '',
    horarioEjercicio: '',
    // Paso 3 — composición corporal (opcional)
    grasaPorcentaje: null as number | null,
    masaMagraPorcentaje: null as number | null,
    grasaVisceral: null as number | null,
    // Paso 4 — alimentos y registro de 24 h
    gusta: [] as string[],
    noGusta: [] as string[],
    restricciones: [] as string[],
    notasAlimentos: '',
    registroActivo: true,
    registroHora: '08:00',
    registroNotas: '',
  });

  /**
   * En Angular 22 `form()` recibe un WritableSignal<TModel> y un schemaFn
   * que declara las reglas sobre el path de cada campo.
   */
  protected readonly form = form(this.model, (path) => {
    required(path.nombre);
    minLength(path.nombre, 2);

    required(path.edad);
    min(path.edad, 1);
    max(path.edad, 120);

    required(path.correo);
    email(path.correo);

    min(path.pesoActual, 0);
    max(path.pesoActual, 1000);
    min(path.talla, 0);
    max(path.talla, 300);
    min(path.pesoMeta, 0);
    max(path.pesoMeta, 1000);
    min(path.diasEjercicio, 0);
    max(path.diasEjercicio, 7);

    // Composición corporal: porcentajes 0-100, grasa visceral 1-59.
    min(path.grasaPorcentaje, 0);
    max(path.grasaPorcentaje, 100);
    min(path.masaMagraPorcentaje, 0);
    max(path.masaMagraPorcentaje, 100);
    min(path.grasaVisceral, 1);
    max(path.grasaVisceral, 59);

    minLength(path.registroHora, 5);
  });

  /** IMC en vivo a partir de peso (kg) y talla (cm). */
  protected readonly imc = computed<number | null>(() =>
    calculateImc(this.form.pesoActual().value(), this.form.talla().value())
  );

  /** Clasificación del IMC según la OMS (adultos). */
  protected readonly imcLabel = computed<string | null>(() => classifyImc(this.imc()));

  // ------------------------------------------------------------------
  // Chips de condiciones y restricciones
  // ------------------------------------------------------------------
  protected hasCondition(condition: string): boolean {
    return this.form.condiciones().value().includes(condition);
  }

  protected toggleCondition(condition: string): void {
    const current = this.form.condiciones().value();
    const isNone = condition === 'Ninguna';

    // 'Ninguna' es excluyente con el resto.
    if (isNone) {
      this.form.condiciones().value.set(current.includes('Ninguna') ? [] : ['Ninguna']);
      return;
    }

    const withoutNone = current.filter((item) => item !== 'Ninguna');
    this.form.condiciones().value.set(
      withoutNone.includes(condition)
        ? withoutNone.filter((item) => item !== condition)
        : [...withoutNone, condition]
    );
  }

  protected hasRestriction(restriction: string): boolean {
    return this.form.restricciones().value().includes(restriction);
  }

  protected toggleRestriction(restriction: string): void {
    const current = this.form.restricciones().value();
    this.form.restricciones().value.set(
      current.includes(restriction)
        ? current.filter((item) => item !== restriction)
        : [...current, restriction]
    );
  }

  protected toggleFoodRecord(): void {
    this.form.registroActivo().value.update((active) => !active);
  }

  // ------------------------------------------------------------------
  // Navegación
  // ------------------------------------------------------------------
  /** Vuelve al listado sin registrar nada. */
  protected goBack(): void {
    this.goToList();
  }

  private goToList(): void {
    void this.router.navigate(['/ascenso/admin/pacientes']);
  }

  // ------------------------------------------------------------------
  // Envío
  // ------------------------------------------------------------------
  protected async submit(): Promise<void> {
    if (this.form().invalid()) {
      this.goToFirstInvalidStep();
      this.snackBar.open('Revisa los campos obligatorios.', 'OK', { duration: 3000 });
      return;
    }

    this.saving.set(true);

    const profile = this.toProfile();

    if (!this.connectivity.online()) {
      await this.patients.saveDraft(profile);
      this.saving.set(false);
      this.snackBar.open('Borrador guardado. Se creará al volver la señal.', 'OK', {
        duration: 4000,
      });
      this.goToList();
      return;
    }

    const result = await this.patients.createPatient(profile);
    this.saving.set(false);

    if (result.status === 'success' && result.data) {
      const created = result.data;

      // Si falló la escritura del expediente se avisa, porque repetir el alta
      // daría "email already exists".
      if (created.profileSaved === false) {
        this.snackBar.open(
          'Cuenta creada, pero el expediente clínico no se guardó. Revisa la consola y vuelve a escribirlo desde la ficha del paciente.',
          'OK',
          { duration: 7000 }
        );
      } else {
        this.snackBar.open(
          created.emailSent === false ? 'Paciente registrado (el correo NO se envió).' : 'Paciente registrado.',
          'OK',
          { duration: 3000 }
        );
      }

      // Las credenciales se muestran al terminar el alta; al cerrarlas se
      // vuelve al listado. Esto antes vivía en `afterClosed()` de
      // `PacientesComponent.openIntake()`.
      this.dialog
        .open(CredentialsDialog, {
          data: { ...created, phone: profile.phone },
          width: '460px',
          maxWidth: '100vw',
        })
        .afterClosed()
        .subscribe(() => this.goToList());
      return;
    }

    const message = result.status === 'error' ? result.message : 'No se pudo registrar';
    this.snackBar.open(message, 'GUARDAR BORRADOR', { duration: 6000 }).onAction().subscribe(async () => {
      await this.patients.saveDraft(profile);
      this.goToList();
    });
  }

  /** Salta al primer paso con campos obligatorios sin capturar. */
  private goToFirstInvalidStep(): void {
    const value = this.form();
    const stepper = this.stepper();
    if (!stepper) return;

    // Solo el paso 1 tiene obligatorios; el resto se puede dejar en blanco.
    if (this.form.nombre().invalid() || this.form.correo().invalid() || this.form.edad().invalid()) {
      stepper.selectedIndex = 0;
    }
  }

  /** Traduce el formulario al expediente que se guarda. */
  private toProfile(): Omit<PatientProfile, 'uid'> {
    const now = Date.now();

    const conditions = this.form.condiciones().value().filter((item) => item !== 'Ninguna');
    const derivedTags = conditions.map((item) => item.toLowerCase());

    return {
      displayName: this.form.nombre().value().trim(),
      email: this.form.correo().value().trim(),
      age: Number(this.form.edad().value()),
      sex: this.form.sexo().value(),
      birthDate: this.form.fechaNacimiento().value() || undefined,
      phone: this.form.telefono().value().trim() || undefined,

      anamnesis: {
        conditions,
        allergies: this.form.alergias().value().trim(),
        intolerances: this.form.intolerancias().value(),
        medications: this.form.medicamentos().value().trim(),
        familyHistory: this.form.antecedentesFamiliares().value().trim(),
        surgeries: this.form.cirugias().value().trim(),
        notes: this.form.notasAntecedentes().value().trim(),
      },

      objective: {
        goal: this.form.objetivo().value(),
        targetWeightKg: this.form.pesoMeta().value() ? Number(this.form.pesoMeta().value()) : undefined,
        targetDate: this.form.fechaMeta().value() || undefined,
        patientExpectation: this.form.expectativa().value().trim() || undefined,
      },

      activity: {
        level: this.form.nivelActividad().value(),
        jobType: this.form.tipoTrabajo().value().trim(),
        exerciseDays: Number(this.form.diasEjercicio().value()) || 0,
        exerciseType: this.form.tipoEjercicio().value().trim(),
        routineTime: this.form.horarioEjercicio().value() || undefined,
      },

      food: {
        likes: this.form.gusta().value(),
        dislikes: this.form.noGusta().value(),
        restrictions: this.form.restricciones().value(),
        intolerances: this.form.intolerancias().value(),
        notes: this.form.notasAlimentos().value().trim(),
      },

      bodyComposition: {
        fatPercentage: this.form.grasaPorcentaje().value() ?? undefined,
        leanMassPercentage: this.form.masaMagraPorcentaje().value() ?? undefined,
        visceralFat: this.form.grasaVisceral().value() ?? undefined,
      },

      foodRecord24h: {
        enabled: this.form.registroActivo().value(),
        timeOfDay: this.form.registroHora().value() || '08:00',
        notes: this.form.registroNotas().value().trim() || undefined,
      },

      initialWeight: this.form.pesoActual().value() ? Number(this.form.pesoActual().value()) : undefined,
      initialHeight: this.form.talla().value() ? Number(this.form.talla().value()) : undefined,
      tags: derivedTags,
      archived: false,
      createdAt: now,
      updatedAt: now,
      lastContactAt: now,
    };
  }
}
