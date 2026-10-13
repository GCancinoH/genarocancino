import { ActivityLevel, PatientGoal, Sex } from './patient-profile';

/**
 * Etiquetas y utilidades de presentación clínica.
 *
 * Compartidas por el alta de paciente (`new-patient`) y el expediente
 * (`player-edit`), para que el mismo dato se muestre igual en los dos lados.
 */

// ------------------------------------------------------------------
// Identificación
// ------------------------------------------------------------------
export const SEX_LABELS: Record<Sex, string> = {
  M: 'MASCULINO',
  F: 'FEMENINO',
  O: 'OTRO / NO ESPECIFICADO',
};

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'F', label: SEX_LABELS.F },
  { value: 'M', label: SEX_LABELS.M },
  { value: 'O', label: SEX_LABELS.O },
];

// ------------------------------------------------------------------
// Objetivo terapéutico
// ------------------------------------------------------------------
export const GOAL_LABELS: Record<PatientGoal, string> = {
  'perdida-peso': 'PÉRDIDA DE PESO',
  'ganar-masa': 'GANAR MASA',
  recomposicion: 'RECOMPOSICIÓN',
  'salud-metabolica': 'SALUD METABÓLICA',
  'rendimiento-deportivo': 'RENDIMIENTO DEPORTIVO',
  mantenimiento: 'MANTENIMIENTO',
};

export const GOAL_OPTIONS: { value: PatientGoal; label: string }[] = [
  { value: 'perdida-peso', label: GOAL_LABELS['perdida-peso'] },
  { value: 'ganar-masa', label: GOAL_LABELS['ganar-masa'] },
  { value: 'recomposicion', label: GOAL_LABELS.recomposicion },
  { value: 'salud-metabolica', label: GOAL_LABELS['salud-metabolica'] },
  { value: 'rendimiento-deportivo', label: GOAL_LABELS['rendimiento-deportivo'] },
  { value: 'mantenimiento', label: GOAL_LABELS.mantenimiento },
];

// ------------------------------------------------------------------
// Nivel de actividad
// ------------------------------------------------------------------
export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentario: 'SEDENTARIO',
  ligero: 'LIGERO (1-2 DÍAS)',
  moderado: 'MODERADO (3-4 DÍAS)',
  intenso: 'INTENSO (5-6 DÍAS)',
  atleta: 'ALTA RENDIMIENTO',
};

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentario', label: ACTIVITY_LABELS.sedentario },
  { value: 'ligero', label: ACTIVITY_LABELS.ligero },
  { value: 'moderado', label: ACTIVITY_LABELS.moderado },
  { value: 'intenso', label: ACTIVITY_LABELS.intenso },
  { value: 'atleta', label: ACTIVITY_LABELS.atleta },
];

// ------------------------------------------------------------------
// Antropometría
// ------------------------------------------------------------------

/** IMC en kg/m² a partir de peso (kg) y talla (cm). null si falta alguno. */
export function calculateImc(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined
): number | null {
  if (weightKg === null || weightKg === undefined) return null;
  if (heightCm === null || heightCm === undefined) return null;
  // NaN e Infinity son truthy, así que hay que descartarlos aparte.
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm)) return null;
  // Un valor negativo también es truthy: sin esto produciría un IMC
  // negativo en vez de null.
  if (weightKg <= 0 || heightCm <= 0) return null;

  const heightM = heightCm / 100;
  const value = weightKg / (heightM * heightM);
  return Number.isFinite(value) ? Number(value.toFixed(1)) : null;
}

/** Clasificación del IMC según la OMS (adultos). */
export function classifyImc(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value < 18.5) return 'BAJO PESO';
  if (value < 25) return 'PESO NORMAL';
  if (value < 30) return 'SOBREPESO';
  return 'OBESIDAD';
}

// ------------------------------------------------------------------
// Formateo
// ------------------------------------------------------------------

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY'. Devuelve '—' si no hay fecha. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Edad en años completos a partir de una fecha 'YYYY-MM-DD'.
 *
 * Devuelve null si no hay fecha utilizable, si tiene un formato inválido o
 * si es posterior a hoy.
 *
 * La fecha se parsea a mano en vez de con `new Date('YYYY-MM-DD')`: ese
 * constructor interpreta la cadena como medianoche UTC, así que en zonas con
 * desplazamiento negativo (México) el día retrocede y la edad se acaba
 * calculando un día tarde — justo el día del cumpleaños.
 */
export function ageFromDate(value: string | null | undefined): number | null {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const anio = Number(match[1]);
  const mes = Number(match[2]) - 1;
  const dia = Number(match[3]);
  if (!Number.isInteger(anio) || mes < 0 || mes > 11 || dia < 1 || dia > 31) return null;

  const hoy = new Date();
  // El cumpleaños cuenta recién en el día, no antes: si hoy cae el mismo
  // mes y día, ya cumplió.
  const yaCumplio =
    hoy.getMonth() > mes || (hoy.getMonth() === mes && hoy.getDate() >= dia);

  const edad = hoy.getFullYear() - anio - (yaCumplio ? 0 : 1);
  return edad >= 0 ? edad : null;
}

/** Número con una decimal, o '—' si no hay dato. */
export function formatNumber(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${Number(value.toFixed(1))}${suffix}`;
}
