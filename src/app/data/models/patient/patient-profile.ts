/**
 * Expediente clínico del paciente (Panel del Nutriólogo).
 *
 * Estos datos se guardan en `players/{uid}` (el mismo documento de la app)
 * y se reflejan en el espejo local `patients` de IndexedDB para lectura
 * offline. Las fechas viajan como ISO string ('YYYY-MM-DD') o epoch millis.
 */

export type Sex = 'M' | 'F' | 'O';

export type PatientGoal =
  | 'perdida-peso'
  | 'ganar-masa'
  | 'recomposicion'
  | 'salud-metabolica'
  | 'rendimiento-deportivo'
  | 'mantenimiento';

export type ActivityLevel = 'sedentario' | 'ligero' | 'moderado' | 'intenso' | 'atleta';


export interface PatientAnamnesis {
  /** Condiciones declaradas: diabetes, hipertensión, embarazo, etc. */
  conditions: string[];
  /** Alergias alimentarias o a fármacos. */
  allergies: string;
  /** Intolerancias: lactosa, gluten, etc. */
  intolerances: string[];
  /** Fármacos y suplementos. */
  medications: string;
  /** Antecedentes familiares. */
  familyHistory: string;
  /** Cirugias previas relevantes. */
  surgeries: string;
  /** Notas libres del paso 2. */
  notes: string;
}

export interface PatientObjective {
  goal: PatientGoal;
  /** Peso meta en kg. */
  targetWeightKg?: number;
  /** Fecha objetivo 'YYYY-MM-DD'. */
  targetDate?: string;
  /** Lo que el paciente espera lograr, en sus palabras. */
  patientExpectation?: string;
}

/**
 * Composición corporal de la captura inicial.
 * Todos los porcentajes se guardan como número (ej. 24.5 = 24.5 %).
 */
export interface BodyComposition {
  /** % de grasa corporal. */
  fatPercentage?: number;
  /** % de masa magra. */
  leanMassPercentage?: number;
  /** Grasa visceral (escala 1–59 según bioimpedancia). */
  visceralFat?: number;
}

/**
 * Registro alimentario de 24 horas (no es una alarma).
 *
 * El paciente anota TODO lo que come y bebe durante un día completo: horarios,
 * cantidades y preparación. Es el registro que el nutriólogo revisa para
 * evaluar patrón alimentario real.
 */
export interface FoodRecord24h {
  /** Si el paciente está llevando el registro. */
  enabled: boolean;
  /** Hora a la que el paciente suele llenarlo. */
  timeOfDay: string;
  /** Libre: cómo prepara la comida, con quién come, etc. */
  notes?: string;
}

export interface PatientActivity {
  level: ActivityLevel;
  /** Tipo de trabajo: sedentario, mixto, físico. */
  jobType: string;
  /** Días por semana con ejercicio. */
  exerciseDays: number;
  /** Tipo de ejercicio: pesas, cardio, crossfit, etc. */
  exerciseType: string;
  /** Horarios en los que suele hacer ejercicio. */
  routineTime?: string;
}

export interface FoodPreferences {
  /** Alimentos que sí le gustan (chip input). */
  likes: string[];
  /** Alimentos que no le gustan. */
  dislikes: string[];
  /** Restricciones: vegetariano, vegano, sin gluten, halal, etc. */
  restrictions: string[];
  /** Intolerancias (seCapturan también en la anamnesis). */
  intolerances: string[];
  notes: string;
}

export interface PatientProfile {
  uid: string;

  // --- Cuenta (los escribe el Admin SDK al crear el usuario) ---
  displayName: string | null;
  email: string | null;
  age?: number;

  // --- Identificación ---
  sex?: Sex;
  birthDate?: string;
  phone?: string;

  // --- Captura inicial (mat-stepper) ---
  anamnesis?: PatientAnamnesis;
  objective?: PatientObjective;
  activity?: PatientActivity;
  food?: FoodPreferences;
  bodyComposition?: BodyComposition;
  /** Registro de todo lo que come/bebe en un día (no es una alarma). */
  foodRecord24h?: FoodRecord24h;
  initialWeight?: number;
  initialHeight?: number;

  // --- Operational ---
  tags?: string[];
  archived?: boolean;
  archivedAt?: number;
  createdAt?: number;
  updatedAt?: number;
  /** Última vez que el paciente registró algo (peso, ayuno, sueño). */
  lastContactAt?: number;
  /** Última consulta con el nutriólogo. */
  lastConsultationAt?: number;
}

/** Borrador de alta: existe solo en el dispositivo hasta que hay conexión. */
export interface PatientDraft {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: 'pending' | 'creating' | 'failed' | 'done';
  error?: string;
  profile: Omit<PatientProfile, 'uid'>;
}

export const EMPTY_ANAMNESIS: PatientAnamnesis = {
  conditions: [],
  allergies: '',
  intolerances: [],
  medications: '',
  familyHistory: '',
  surgeries: '',
  notes: '',
};

export const EMPTY_OBJECTIVE: PatientObjective = {
  goal: 'perdida-peso',
  targetWeightKg: undefined,
  targetDate: undefined,
  patientExpectation: '',
};

export const EMPTY_ACTIVITY: PatientActivity = {
  level: 'sedentario',
  jobType: '',
  exerciseDays: 0,
  exerciseType: '',
  routineTime: '',
};

export const EMPTY_FOOD: FoodPreferences = {
  likes: [],
  dislikes: [],
  restrictions: [],
  intolerances: [],
  notes: '',
};

/** Registro alimentario de 24 h por defecto (activado a las 08:00). */
export const DEFAULT_FOOD_RECORD_24H: FoodRecord24h = {
  enabled: true,
  timeOfDay: '08:00',
};
