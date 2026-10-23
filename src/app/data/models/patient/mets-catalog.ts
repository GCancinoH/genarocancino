/**
 * Catálogo de actividades con su valor MET.
 *
 * Sirve de origen para el select de "tipo de ejercicio" del alta de
 * paciente. El valor se GUARDA en el expediente (`exercises[].mets`) y no
 * solo se usa para etiquetar, para que el nutriólogo pueda estimar el
 * gasto energético de la rutina con la fórmula clásica:
 *
 *     kcal ≈ METs × peso (kg) × horas
 *
 * Los valores provienen del Compendium of Physical Activities (2011),
 * que es el estándar más usado en práctica clínica. Es un listado de
 * referencia: no sustituye a un estudio de gasto energético individual
 * (indirect calorimetría), pero sí ordena la comparación entre
 * actividades.
 */

export interface MetsActivity {
  /** Nombre tal como se muestra en el select. */
  readonly label: string;
  /** Valor MET (metabolic equivalent of task). */
  readonly mets: number;
}

export interface MetsCategory {
  /** Nombre del grupo mostrado en el select. */
  readonly label: string;
  readonly activities: readonly MetsActivity[];
}

export const METS_CATALOG: readonly MetsCategory[] = [
  {
    label: 'Vida diaria',
    activities: [
      { label: 'Dormir', mets: 0.9 },
      { label: 'Sentado / ver televisión', mets: 1.0 },
      { label: 'Meditar', mets: 1.3 },
      { label: 'Trabajo de oficina (sentado)', mets: 1.5 },
      { label: 'Ejercicios de respiración', mets: 1.5 },
      { label: 'De pie (ligero)', mets: 1.8 },
      { label: 'Cocina', mets: 2.3 },
      { label: 'Masaje', mets: 2.5 },
      { label: 'Cuidado de un niño pequeño', mets: 3.0 },
      { label: 'Compras con bolsas', mets: 3.5 },
    ],
  },
  {
    label: 'Caminar',
    activities: [
      { label: 'Caminar lento (3.2 km/h)', mets: 2.8 },
      { label: 'Caminar (4.8 km/h)', mets: 3.3 },
      { label: 'Caminar rápido (5.6 km/h)', mets: 4.3 },
      { label: 'Caminar muy rápido (6.4 km/h)', mets: 5.0 },
      { label: 'Caminar en cuesta', mets: 6.0 },
      { label: 'Caminar en escaleras', mets: 8.0 },
      { label: 'Senderismo', mets: 6.0 },
    ],
  },
  {
    label: 'Casa y jardín',
    activities: [
      { label: 'Limpieza del hogar', mets: 3.3 },
      { label: 'Jardinería', mets: 4.0 },
      { label: 'Cortar pasto (cortadora)', mets: 3.5 },
      { label: 'Quitar hojas', mets: 4.0 },
      { label: 'Cargar mandado', mets: 4.0 },
      { label: 'Mover cajas / carga pesada', mets: 5.8 },
    ],
  },
  {
    label: 'Fuerza',
    activities: [
      { label: 'Pesas (general)', mets: 3.5 },
      { label: 'Pesas (intenso)', mets: 6.0 },
      { label: 'Ejercicios con el peso corporal', mets: 3.8 },
      { label: 'Calistenia', mets: 3.8 },
      { label: 'Calistenia (intensa)', mets: 8.0 },
      { label: 'Circuito de resistencia', mets: 8.0 },
    ],
  },
  {
    label: 'Cardio',
    activities: [
      { label: 'Trote suave (8 km/h)', mets: 8.3 },
      { label: 'Correr (9.7 km/h)', mets: 9.8 },
      { label: 'Correr rápido (11.3 km/h)', mets: 11.0 },
      { label: 'Correr muy rápido (12.9 km/h)', mets: 11.8 },
      { label: 'Máquina elíptica', mets: 5.0 },
      { label: 'Remo (máquina)', mets: 7.0 },
      { label: 'Escalera mecánica', mets: 9.0 },
      { label: 'Cuerda saltar (lento)', mets: 8.8 },
      { label: 'Cuerda saltar (rápido)', mets: 11.8 },
    ],
  },
  {
    label: 'Ciclismo',
    activities: [
      { label: 'Ciclismo de placer (16-19 km/h)', mets: 6.8 },
      { label: 'Ciclismo rápido (19-22 km/h)', mets: 8.0 },
      { label: 'Ciclismo de montaña', mets: 8.5 },
    ],
  },
  {
    label: 'Acuáticos',
    activities: [
      { label: 'Nadar (lapas, tranquilo)', mets: 4.8 },
      { label: 'Nadar (lapas, intenso)', mets: 9.8 },
      { label: 'Aeróbicos acuáticos', mets: 5.3 },
    ],
  },
  {
    label: 'Mente y cuerpo',
    activities: [
      { label: 'Yoga (Hatha)', mets: 2.5 },
      { label: 'Pilates', mets: 3.0 },
      { label: 'Estiramiento', mets: 2.3 },
      { label: 'Bailar (general)', mets: 4.5 },
      { label: 'Bailar (rápido)', mets: 7.8 },
    ],
  },
  {
    label: 'Deportes',
    activities: [
      { label: 'Fútbol (partido)', mets: 7.0 },
      { label: 'Fútbol (recreativo)', mets: 5.0 },
      { label: 'Basquetbol (partido)', mets: 6.5 },
      { label: 'Basquetbol (tirar a canasta)', mets: 4.5 },
      { label: 'Tenis (individual)', mets: 7.3 },
      { label: 'Tenis (dobles)', mets: 5.0 },
      { label: 'Voleibol (competitivo)', mets: 6.0 },
      { label: 'Voleibol (recreativo)', mets: 4.0 },
      { label: 'Bádminton (competitivo)', mets: 7.0 },
      { label: 'Bádminton (recreativo)', mets: 4.5 },
      { label: 'Ping pong', mets: 4.0 },
      { label: 'Golf (caminando)', mets: 4.3 },
      { label: 'Boxeo (saco)', mets: 5.5 },
      { label: 'Boxeo (sparring)', mets: 9.0 },
      { label: 'Artes marciales', mets: 10.3 },
    ],
  },
];

/**
 * Aplanado para el select y para buscar por nombre.
 * Se calcula una sola vez al cargar el módulo.
 */
export const METS_ACTIVITIES: readonly MetsActivity[] = METS_CATALOG.flatMap(
  (category) => category.activities
);

/**
 * MET de una actividad por su nombre exacto.
 *
 * `null` si el nombre no está en el catálogo: puede ocurrir si se editó un
 * expediente capturado con una versión anterior del catálogo.
 */
export function metsFor(activity: string): number | null {
  return METS_ACTIVITIES.find((item) => item.label === activity)?.mets ?? null;
}
