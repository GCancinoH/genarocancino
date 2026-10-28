/**
 * Un alimento de la tabla SMAE (Sistema Mexicano de Alimentos Equivalentes).
 *
 * La tabla es una fuente oficial estática, así que se sirve como archivo
 * estático desde `public/data/smae.json` (ver `scripts/smae_to_json.py`) en
 * vez de pedir 2.353 documentos a Firestore cada vez que se abre el plan.
 *
 * Los números corresponden a **una porción estándar**, no a 100 g: así los
 * publica el SMAE y así se arman las comidas ("2 taza de acelga cruda").
 */
export interface SmaeFood {
  /** Grupo de intercambio: Verdura, Frutas, Cereales sin grasa… */
  categoria: string;
  /** Nombre del alimento, tal como lo publica la tabla. */
  nombre: string;
  /** Cantidad de la porción estándar (ej. 2 o 0.5). */
  cantidad: number | null;
  /** Unidad de esa cantidad: taza, pieza, rebanada… */
  unidad: string;
  /** Peso neto de la porción en gramos. */
  peso: number | null;
  /** Energía por porción. */
  kcal: number | null;
  /** Proteína (g) por porción. */
  proteina: number | null;
  /** Lípidos (g) por porción. */
  lipidos: number | null;
  /** Hidratos de carbono (g) por porción. */
  hidratos: number | null;
  /** Fibra (g) por porción. */
  fibra: number | null;
}

/**
 * Suma dos macros que pudieran ser null.
 *
 * `null` es "sin dato" y **no es 0**: si se sumara como 0, un alimento del
 * que falta la proteína bajaría el total del día en silencio. Solo se
 * devuelve null si no hay ningún valor conocido.
 */
export function sumMacro(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null && b == null) return null;
  return (a ?? 0) + (b ?? 0);
}
