/**
 * Expediente clínico del paciente (Panel del Nutriólogo).
 *
 * Estos datos se guardan en `players/{uid}` (el mismo documento de la app)
 * y se reflejan en el espejo local `patients` de IndexedDB para lectura
 * offline. Las fechas viajan como ISO string ('YYYY-MM-DD') o epoch millis.
 */

export type Sex = 'M' | 'F' ;

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
  /**
   * % de masa magra. LEGADO: las altas nuevas ya no escriben este mapa en
   * el perfil; van a `body_composition`. Se conserva para poder leer los
   * expedientes capturados antes.
   */
  leanMassPercentage?: number;
  /**
   * % de masa muscular. Diferente de la masa magra: la magra incluye
   * hueso, agua y órganos; esta es solo músculo. Es el que mide la
   * báscula del paciente, así que el alta pasó a pedirlo.
   */
  muscleMassPercentage?: number;
  /** Grasa visceral (escala 1–59 según bioimpedancia). */
  visceralFat?: number;
}

/**
 * Alimento dentro de una sección de comida.
 *
 * Se captura tal como lo dice el paciente: "2 tortillas", "1 plato",
 * "350 ml". No se convierte a gramos ni a kcal aquí — eso lo decide el
 * nutriólogo al revisar.
 */
export interface FoodEntry {
  /** Alimento, en las palabras del paciente. */
  food: string;
  /** Porción aproximada. */
  portion: string;
}

/**
 * Una comida del día: desayuno, comida, cena, colaciones...
 *
 * El número de secciones es libre porque los horarios reales no siempre
 * son tres. El formulario arranca con tres por defecto.
 */
export interface MealSection {
  /** Nombre de la comida: "Desayuno", "Comida 2"... */
  name: string;
  /** Hora aproximada, opcional. */
  time?: string;
  /** Alimentos de esta comida. */
  items: FoodEntry[];
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
  /** Secciones de comida del día. */
  meals?: MealSection[];
  /**
   * Legado: única hora del registro, capturada antes de que existieran las
   * secciones. Se conserva para poder leer expedientes viejos; el formulario
   * ya no la escribe.
   */
  timeOfDay?: string;
  /** Libre: cómo prepara la comida, con quién come, etc. */
  notes?: string;
}

/**
 * Una actividad física del día, con la duración y el MET que le
 * corresponde según el catálogo (`mets-catalog.ts`).
 */
export interface ExerciseEntry {
  /** Actividad, tomada del catálogo de METs. */
  activity: string;
  /** Duración diaria, en minutos. */
  minutes: number;
  /** MET capturado al momento del alta. */
  mets: number;
}

export interface PatientActivity {
  level: ActivityLevel;
  /** Tipo de trabajo: sedentario, mixto, físico. */
  jobType: string;
  /** Horas de trabajo al día. */
  jobHours?: number;
  /** Días por semana con ejercicio. */
  exerciseDays: number;
  /** Rutina: cada actividad que hace, con su duración y MET. */
  exercises?: ExerciseEntry[];
  /**
   * Legado: descripción libre del ejercicio, capturada antes del catálogo.
   * Se conserva para leer expedientes viejos; el formulario ya no la escribe.
   */
  exerciseType?: string;
  /** Legado: hora habitual de ejercicio. */
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
  /** LEGADO: el peso y los porcentajes van ahora a `body_composition`. */
  bodyComposition?: BodyComposition;
  /** Registro de todo lo que come/bebe en un día (no es una alarma). */
  foodRecord24h?: FoodRecord24h;
  /** LEGADO: el peso inicial vive ahora en el doc de `baselineId`. */
  initialWeight?: number;
  /** Talla en cm. Sí se queda aquí: es un atributo, no una serie. */
  initialHeight?: number;
  /**
   * id del doc de `body_composition` que es la línea base del paciente.
   *
   * Las altas nuevas escriben la medición inicial en esa colección —la
   * misma a la que el paciente después registra sus pesajes desde el
   * dashboard— para que comparar contra el punto de partida no obligue a
   * leer dos sitios distintos.
   *
   * `undefined` en los expedientes capturados antes, que guardan el dato
   * dentro del propio perfil: por eso la vista clínica consulta primero
   * el puntero y si no está cae a `bodyComposition`.
   */
  baselineId?: string;

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

/**
 * Tres comidas por defecto para el registro de 24 h.
 *
 * Se generan como función y no como constante compartida para que cada
 * alta reciba su propio array: si fuera la misma referencia, añadir un
 * alimento en un paciente contaminaría al siguiente.
 */
export function defaultMeals(): MealSection[] {
  return [
    { name: 'Comida 1', time: '08:00', items: [] },
    { name: 'Comida 2', time: '14:00', items: [] },
    { name: 'Comida 3', time: '20:00', items: [] },
  ];
}

/** Registro alimentario de 24 h por defecto (activado, con tres comidas). */
export const DEFAULT_FOOD_RECORD_24H: FoodRecord24h = {
  enabled: true,
  meals: defaultMeals(),
};
