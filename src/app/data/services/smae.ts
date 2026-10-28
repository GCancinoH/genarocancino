import { Service, computed, signal } from '@angular/core';
import { SmaeFood } from '@data/models/player/smae';

/** Quita acentos y pasa a minúsculas para poder buscar "brocoli" ≈ "Brócoli". */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Catálogo SMAE: la tabla de alimentos que alimenta el plan de alimentación.
 *
 * Son ~2.353 alimentos estáticos que se sirven como archivo desde
 * `public/data/smae.json` y se descargan **una sola vez** al abrir el plan,
 * quedando en memoria. No van a Firestore: es una tabla oficial que no cambia
 * entre usuarios, y pedir esos documentos en cada consulta sería un costo
 * enorme a cambio de nada.
 *
 * El JSON se genera con `python3 scripts/smae_to_json.py`.
 */
@Service()
export class SmaeService {
  private readonly foods = signal<readonly SmaeFood[]>([]);
  private pending: Promise<void> | null = null;

  /** Todos los alimentos, ya cargados. Vacío mientras no se llame a `load()`. */
  readonly list = this.foods.asReadonly();

  readonly loaded = computed(() => this.foods().length > 0);

  /**
   * Grupos de la tabla en el orden en que aparecen en el archivo original.
   *
   * Se derivan de los datos y no de una lista escrita a mano: si actualizan
   * la tabla con una categoría nueva, el filtro la sigue mostrando sin tener
   * que tocar el código.
   */
  readonly categories = computed<string[]>(() => {
    const seen: string[] = [];
    for (const food of this.foods()) {
      if (!seen.includes(food.categoria)) seen.push(food.categoria);
    }
    return seen;
  });

  /**
   * Descarga el catálogo. Idempotente: si ya se cargó regresa enseguida, y si
   * falló (por ejemplo sin conexión) deja la puerta abierta a reintentar en
   * la siguiente llamada en vez de memorizar el error.
   */
  load(): Promise<void> {
    if (this.loaded()) return Promise.resolve();
    this.pending ??= this.fetchTable().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async fetchTable(): Promise<void> {
    // Se resuelve contra `baseURI` y no contra la URL de la página: con una
    // ruta profunda como `/pacientes/abc`, un `data/smae.json` relativo a la
    // página buscaría en `/pacientes/data/smae.json` y no existiría.
    const url = new URL('data/smae.json', document.baseURI).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error(`No se pudo cargar la tabla SMAE (HTTP ${response.status})`);
    this.foods.set((await response.json()) as SmaeFood[]);
  }

  /** Alimentos cuyo nombre o categoría contienen el término escrito. */
  search(term: string): readonly SmaeFood[] {
    const query = normalize(term);
    if (!query) return [];
    return this.foods().filter(
      (food) => normalize(food.nombre).includes(query) || normalize(food.categoria).includes(query)
    );
  }

  /** Alimentos de un solo grupo. */
  byCategory(category: string): readonly SmaeFood[] {
    return this.foods().filter((food) => food.categoria === category);
  }
}
