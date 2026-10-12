import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormField, form, email, max, min, minLength, required } from '@angular/forms/signals';
// Material
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
import {
  ActivityLevel,
  PatientGoal,
  PatientProfile,
  Sex,
} from '@data/models/patient/patient-profile';
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

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentario', label: 'SEDENTARIO' },
  { value: 'ligero', label: 'LIGERO (1-2 DÍAS)' },
  { value: 'moderado', label: 'MODERADO (3-4 DÍAS)' },
  { value: 'intenso', label: 'INTENSO (5-6 DÍAS)' },
  { value: 'atleta', label: 'ALTA RENDIMIENTO' },
];

const GOAL_OPTIONS: { value: PatientGoal; label: string }[] = [
  { value: 'perdida-peso', label: 'PÉRDIDA DE PESO' },
  { value: 'ganar-masa', label: 'GANAR MASA' },
  { value: 'recomposicion', label: 'RECOMPOSICIÓN' },
  { value: 'salud-metabolica', label: 'SALUD METABÓLICA' },
  { value: 'rendimiento-deportivo', label: 'RENDIMIENTO DEPORTIVO' },
  { value: 'mantenimiento', label: 'MANTENIMIENTO' },
];

/**
 * Alta de paciente en 4 pasos.
 *
 * Paso 1  Datos de cuenta (los que necesita el backend para crear el usuario)
 * Paso 2  Antecedentes
 * Paso 3  Objetivo y actividad
 * Paso 4  Alimentos y registro alimentario de 24 h
 *
 * Si no hay conexión, el alta se guarda como borrador en IndexedDB y se
 * completa sola al recuperar la señal (ver `PatientsRepository.flushDrafts`).
 */
@Component({
  selector: 'app-patient-intake',
  standalone: true,
  imports: [
    FormField,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIcon,
    MatInputModule,
    MatSelectModule,
    MatStepperModule,
    MatProgressBarModule,
    ChipInput,
    FullWidthDirective,
  ],
  template: `
    <div class="intake">
      <!-- Cabecera -->
      <div class="intake-header">
        <span class="header-bracket">[</span>
        <span class="header-text">ALTA DE PACIENTE</span>
        <span class="header-bracket">]</span>
      </div>

      <mat-progress-bar
        mode="indeterminate"
        class="sync-bar"
        [class.visible]="saving()"
      />

      <div class="offline-banner" [class.hidden]="online()">
        <mat-icon>cloud_off</mat-icon>
        <span>
          SIN CONEXIÓN — se guardará como BORRADOR y el alta se completará
          automáticamente al volver la señal.
        </span>
      </div>

      <mat-stepper #stepper linear="false" class="intake-stepper">
        <!-- ============ PASO 1: CUENTA ============ -->
        <mat-step label="Datos">
          <div class="step-body">
            <mat-form-field appearance="outline" fullWidth>
              <mat-label>NOMBRE COMPLETO</mat-label>
              <input matInput type="text" [formField]="form.nombre" placeholder="Ej. Ana López" />
              <mat-icon matSuffix>person</mat-icon>
              @if (form.nombre().touched() && form.nombre().invalid()) {
                <mat-error>ES OBLIGATORIO (mínimo 2 caracteres)</mat-error>
              }
            </mat-form-field>

            <div class="field-row">
              <mat-form-field appearance="outline">
                <mat-label>EDAD</mat-label>
                <input matInput type="number" [formField]="form.edad" />
                @if (form.edad().touched() && form.edad().invalid()) {
                  <mat-error>ENTRE 1 Y 120</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>FECHA DE NACIMIENTO</mat-label>
                <input matInput type="date" [formField]="form.fechaNacimiento" />
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" fullWidth>
              <mat-label>SEXO</mat-label>
              <mat-select [formField]="form.sexo">
                @for (option of sexOptions; track option.value) {
                  <mat-option [value]="option.value">{{ option.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" fullWidth>
              <mat-label>CORREO ELECTRÓNICO</mat-label>
              <input matInput type="email" [formField]="form.correo" placeholder="ejemplo@correo.com" />
              <mat-icon matSuffix>email</mat-icon>
              @if (form.correo().touched() && form.correo().invalid()) {
                <mat-error>CORREO VÁLIDO OBLIGATORIO</mat-error>
              }
              <mat-hint>Aquí se enviarán sus credenciales de acceso</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" fullWidth>
              <mat-label>TELÉFONO (opcional)</mat-label>
              <input matInput type="tel" [formField]="form.telefono" placeholder="+52 55 1234 5678" />
              <mat-icon matSuffix>phone</mat-icon>
            </mat-form-field>
          </div>

          <div class="step-actions">
            <button matButton matStepperNext [disabled]="saving()">
              CONTINUAR <mat-icon iconPositionEnd>arrow_forward</mat-icon>
            </button>
          </div>
        </mat-step>

        <!-- ============ PASO 2: ANTECEDENTES ============ -->
        <mat-step label="Antecedentes">
          <div class="step-body">
            <label class="field-label">CONDICIONES MÉDICAS</label>
            <div class="option-grid">
              @for (option of conditionOptions; track option) {
                <button
                  type="button"
                  class="option-chip"
                  [class.selected]="hasCondition(option)"
                  (click)="toggleCondition(option)"
                >
                  {{ option }}
                </button>
              }
            </div>

            <mat-form-field appearance="outline" fullWidth>
              <mat-label>ALERGIAS</mat-label>
              <textarea
                matInput
                rows="2"
                [formField]="form.alergias"
                placeholder="Alimentos, fármacos, látex..."
              ></textarea>
            </mat-form-field>

            <label class="field-label">INTOLERANCIAS</label>
            <gc-chip-input
              [items]="form.intolerancias().value()"
              (itemsChange)="form.intolerancias().value.set($event)"
              placeholder="LACTOSA, GLUTEN..."
            />

            <mat-form-field appearance="outline" fullWidth>
              <mat-label>FÁRMACOS / SUPLEMENTOS</mat-label>
              <textarea
                matInput
                rows="2"
                [formField]="form.medicamentos"
                placeholder="Nombre y dosis"
              ></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline" fullWidth>
              <mat-label>ANTECEDENTES FAMILIARES</mat-label>
              <textarea
                matInput
                rows="2"
                [formField]="form.antecedentesFamiliares"
                placeholder="Padres, hermanos, abuelos..."
              ></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline" fullWidth>
              <mat-label>CIRUGÍAS PREVIAS</mat-label>
              <input matInput type="text" [formField]="form.cirugias" placeholder="Ej. bypass gástrico 2021" />
            </mat-form-field>

            <mat-form-field appearance="outline" fullWidth>
              <mat-label>NOTAS</mat-label>
              <textarea matInput rows="2" [formField]="form.notasAntecedentes"></textarea>
            </mat-form-field>
          </div>

          <div class="step-actions">
            <button matButton matStepperPrevious>VOLVER</button>
            <button matButton matStepperNext [disabled]="saving()">
              CONTINUAR <mat-icon iconPositionEnd>arrow_forward</mat-icon>
            </button>
          </div>
        </mat-step>

        <!-- ============ PASO 3: OBJETIVO Y ACTIVIDAD ============ -->
        <mat-step label="Objetivo">
          <div class="step-body">
            <mat-form-field appearance="outline" fullWidth>
              <mat-label>OBJETIVO PRINCIPAL</mat-label>
              <mat-select [formField]="form.objetivo">
                @for (option of goalOptions; track option.value) {
                  <mat-option [value]="option.value">{{ option.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <div class="field-row">
              <mat-form-field appearance="outline">
                <mat-label>PESO ACTUAL (KG)</mat-label>
                <input matInput type="number" [formField]="form.pesoActual" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>TALLA (CM)</mat-label>
                <input matInput type="number" [formField]="form.talla" />
              </mat-form-field>
            </div>

            @if (imc() !== null) {
              <div class="imc-banner">
                <mat-icon>calculate</mat-icon>
                <span>
                  IMC CALCULADO: <strong>{{ imc() }}</strong>
                  @if (imcLabel(); as label) {
                    <em class="imc-label">({{ label }})</em>
                  }
                </span>
              </div>
            }

            <label class="field-label">COMPOSICIÓN CORPORAL (OPCIONAL)</label>
            <div class="field-row three-up">
              <mat-form-field appearance="outline">
                <mat-label>% GRASA</mat-label>
                <input matInput type="number" [formField]="form.grasaPorcentaje" placeholder="24.5" />
                <span matSuffix class="unit">%</span>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>% MASA MAGRA</mat-label>
                <input matInput type="number" [formField]="form.masaMagraPorcentaje" placeholder="75.5" />
                <span matSuffix class="unit">%</span>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>GRASA VISCERAL</mat-label>
                <input matInput type="number" [formField]="form.grasaVisceral" placeholder="1-59" />
              </mat-form-field>
            </div>

            <div class="field-row">
              <mat-form-field appearance="outline">
                <mat-label>PESO META (KG)</mat-label>
                <input matInput type="number" [formField]="form.pesoMeta" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>FECHA META</mat-label>
                <input matInput type="date" [formField]="form.fechaMeta" />
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" fullWidth>
              <mat-label>QUÉ ESPERA EL PACIENTE</mat-label>
              <textarea
                matInput
                rows="2"
                [formField]="form.expectativa"
                placeholder="En sus propias palabras..."
              ></textarea>
            </mat-form-field>

            <label class="field-label">NIVEL DE ACTIVIDAD</label>
            <mat-button-toggle-group
              [formField]="form.nivelActividad"
              class="toggle-group"
              aria-label="Nivel de actividad"
            >
              @for (option of activityOptions; track option.value) {
                <mat-button-toggle [value]="option.value">{{ option.label }}</mat-button-toggle>
              }
            </mat-button-toggle-group>

            <div class="field-row">
              <mat-form-field appearance="outline">
                <mat-label>ACTIVIDAD LABORAL</mat-label>
                <input matInput type="text" [formField]="form.tipoTrabajo" placeholder="Sedentario, físico..." />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>DÍAS DE EJERCICIO / SEMANA</mat-label>
                <input matInput type="number" [formField]="form.diasEjercicio" />
              </mat-form-field>
            </div>

            <div class="field-row">
              <mat-form-field appearance="outline">
                <mat-label>TIPO DE EJERCICIO</mat-label>
                <input matInput type="text" [formField]="form.tipoEjercicio" placeholder="Pesas, cardio..." />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>HORARIO HABITUAL</mat-label>
                <input matInput type="time" [formField]="form.horarioEjercicio" />
              </mat-form-field>
            </div>
          </div>

          <div class="step-actions">
            <button matButton matStepperPrevious>VOLVER</button>
            <button matButton matStepperNext [disabled]="saving()">
              CONTINUAR <mat-icon iconPositionEnd>arrow_forward</mat-icon>
            </button>
          </div>
        </mat-step>

        <!-- ============ PASO 4: ALIMENTOS Y RECORDATORIO ============ -->
        <mat-step label="Alimentos">
          <div class="step-body">
            <label class="field-label">ALIMENTOS QUE LE GUSTAN</label>
            <gc-chip-input
              [items]="form.gusta().value()"
              (itemsChange)="form.gusta().value.set($event)"
              placeholder="AVOCADO, HUEVO, POLLO..."
            />

            <label class="field-label">ALIMENTOS QUE NO LE GUSTAN</label>
            <gc-chip-input
              [items]="form.noGusta().value()"
              (itemsChange)="form.noGusta().value.set($event)"
              placeholder="BRÓCOLI, HIGADO..."
            />

            <label class="field-label">RESTRICCIONES</label>
            <div class="option-grid">
              @for (option of restrictionOptions; track option) {
                <button
                  type="button"
                  class="option-chip"
                  [class.selected]="hasRestriction(option)"
                  (click)="toggleRestriction(option)"
                >
                  {{ option }}
                </button>
              }
            </div>

            <mat-form-field appearance="outline" fullWidth>
              <mat-label>NOTAS ALIMENTARIAS</mat-label>
              <textarea
                matInput
                rows="2"
                [formField]="form.notasAlimentos"
                placeholder="Horario de comidas, cocina, presupuesto..."
              ></textarea>
            </mat-form-field>

            <div class="reminder-box">
              <mat-icon>restaurant_menu</mat-icon>
              <div class="reminder-text">
                <div class="reminder-title">REGISTRO ALIMENTARIO DE 24 HORAS</div>
                <div class="reminder-sub">
                  El paciente anota todo lo que come y bebe durante un día
                  completo: horarios, cantidades y preparación.
                </div>
              </div>
              <button
                type="button"
                class="toggle-switch"
                [class.on]="form.registroActivo().value()"
                role="switch"
                [attr.aria-checked]="form.registroActivo().value()"
                (click)="toggleFoodRecord()"
              >
                <span class="knob"></span>
              </button>
            </div>

            @if (form.registroActivo().value()) {
              <mat-form-field appearance="outline" fullWidth>
                <mat-label>HORA EN QUE SUELE LLENARLO</mat-label>
                <input matInput type="time" [formField]="form.registroHora" />
                <mat-icon matSuffix>schedule</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" fullWidth>
                <mat-label>INSTRUCCIONES PARA EL REGISTRO</mat-label>
                <textarea
                  matInput
                  rows="2"
                  [formField]="form.registroNotas"
                  placeholder="Ej. anotar también bebidas y aperitivos entre comidas."
                ></textarea>
              </mat-form-field>
            }
          </div>

          <div class="step-actions">
            <button matButton matStepperPrevious [disabled]="saving()">VOLVER</button>
            <button matButton (click)="submit()" [disabled]="saving()">
              @if (saving()) {
                GUARDANDO...
              } @else if (online()) {
                REGISTRAR PACIENTE
              } @else {
                GUARDAR BORRADOR
              }
            </button>
          </div>
        </mat-step>
      </mat-stepper>
    </div>
  `,
  styles: `
    .intake {
      background: #000;
      color: #fff;
      font-family: 'Inter', sans-serif;
    }

    .intake-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 20px 16px 12px;
    }

    .header-text {
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 3px;
      color: #2575fc;
      text-shadow: 0 0 10px rgba(37, 117, 252, 0.5);
    }

    .header-bracket {
      font-size: 1.1rem;
      color: rgba(37, 117, 252, 0.6);
    }

    .sync-bar {
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .sync-bar.visible {
      opacity: 1;
    }

    .offline-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 16px 8px;
      padding: 10px 14px;
      border: 1px solid rgba(255, 170, 0, 0.4);
      background: rgba(255, 170, 0, 0.08);
      border-radius: 4px;
      color: rgb(255, 170, 0);
      font-size: 0.7rem;
      letter-spacing: 1px;
      line-height: 1.6;
    }

    .offline-banner.hidden {
      display: none;
    }

    .offline-banner mat-icon {
      flex-shrink: 0;
    }

    /* Stepper */
    .intake-stepper {
      background: transparent;
    }

    .step-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px 8px 8px;
      max-height: 52vh;
      overflow-y: auto;
    }

    .field-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .field-row mat-form-field {
      flex: 1;
      min-width: 140px;
    }

    .field-label {
      display: block;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 2px;
      color: rgba(255, 255, 255, 0.45);
      margin: 12px 0 8px;
    }

    .option-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .option-chip {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: rgba(255, 255, 255, 0.6);
      font-family: inherit;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 8px 12px;
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .option-chip.selected {
      border-color: #2575fc;
      color: #fff;
      background: rgba(37, 117, 252, 0.15);
      box-shadow: 0 0 10px rgba(37, 117, 252, 0.2);
    }

    .imc-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      margin-bottom: 12px;
      border: 1px solid rgba(0, 255, 102, 0.3);
      background: rgba(0, 255, 102, 0.06);
      border-radius: 4px;
      color: #00ff66;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.8rem;
      letter-spacing: 1px;
    }

    .imc-label {
      font-style: normal;
      opacity: 0.85;
      margin-left: 6px;
    }

    .field-row.three-up mat-form-field {
      min-width: 110px;
    }

    .unit {
      color: rgba(255, 255, 255, 0.45);
      font-size: 0.8rem;
    }

    /*
     * Material pinta el valor del input con --mat-form-field-input-text-color,
     * que en tema oscuro es gris. Aquí se fuerza blanco para que al escribir
     * el texto se lea con contraste. El placeholder sí se queda gris.
     */
    :host ::ng-deep .intake .mat-mdc-form-field input.mat-mdc-input-element,
    :host ::ng-deep .intake .mat-mdc-form-field textarea.mat-mdc-textarea-wrapper,
    :host ::ng-deep .intake .mat-mdc-select-value,
    :host ::ng-deep .intake .mat-mdc-select-min-line {
      color: #fff;
    }

    :host ::ng-deep .intake .mat-mdc-form-field input.mat-mdc-input-element::placeholder {
      color: rgba(255, 255, 255, 0.35);
    }

    .toggle-group {
      margin-bottom: 12px;
      display: flex;
      flex-wrap: wrap;
    }

    .reminder-box {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      margin: 16px 0 12px;
      border: 1px solid rgba(37, 117, 252, 0.25);
      background: rgba(37, 117, 252, 0.06);
      border-radius: 4px;
    }

    .reminder-box mat-icon {
      color: #2575fc;
    }

    .reminder-text {
      flex: 1;
    }

    .reminder-title {
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: #fff;
    }

    .reminder-sub {
      font-size: 0.68rem;
      color: rgba(255, 255, 255, 0.45);
      margin-top: 2px;
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

    .step-actions {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 8px 20px;
    }

    /* móvil */
    @media (max-width: 640px) {
      .step-body {
        padding: 12px 0 4px;
        max-height: 58vh;
      }

      .field-row {
        gap: 0;
        flex-direction: column;
      }

      .field-row mat-form-field {
        width: 100%;
      }

      .step-actions button {
        flex: 1;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientIntakeComponent {
  private readonly patients = inject(PatientsRepository);
  private readonly connectivity = inject(ConnectivityService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<PatientIntakeComponent>);

  private readonly stepper = viewChild<MatStepper>('stepper');

  protected readonly saving = signal<boolean>(false);
  protected readonly online = this.connectivity.online;

  protected readonly sexOptions: { value: Sex; label: string }[] = [
    { value: 'F', label: 'FEMENINO' },
    { value: 'M', label: 'MASCULINO' },
    { value: 'O', label: 'OTRO' },
  ];

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
  protected readonly imc = computed<number | null>(() => {
    const weight = this.form.pesoActual().value();
    const heightCm = this.form.talla().value();
    if (!weight || !heightCm) return null;
    const heightM = heightCm / 100;
    const value = weight / (heightM * heightM);
    return Number.isFinite(value) ? Number(value.toFixed(1)) : null;
  });

  /** Clasificación del IMC según la OMS (adultos). */
  protected readonly imcLabel = computed<string | null>(() => {
    const value = this.imc();
    if (value === null) return null;
    if (value < 18.5) return 'BAJO PESO';
    if (value < 25) return 'PESO NORMAL';
    if (value < 30) return 'SOBREPESO';
    return 'OBESIDAD';
  });

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
      this.dialogRef.close({ status: 'draft' });
      return;
    }

    const result = await this.patients.createPatient(profile);
    this.saving.set(false);

    if (result.status === 'success' && result.data) {
      const created = result.data;

      // La cuenta ya existe y el correo ya salió: el diálogo se cierra en
      // cualquier caso. Si falló la escritura del expediente se avisa, porque
      // repetir el alta daría "email already exists".
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

      this.dialogRef.close({ status: 'created', data: created, phone: profile.phone });
      return;
    }

    const message = result.status === 'error' ? result.message : 'No se pudo registrar';
    this.snackBar.open(message, 'GUARDAR BORRADOR', { duration: 6000 }).onAction().subscribe(async () => {
      await this.patients.saveDraft(profile);
      this.dialogRef.close({ status: 'draft' });
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
