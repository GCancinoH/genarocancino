import { sumMacro } from '@data/models/player/smae';

/**
 * Alimento elegido del catálogo SMAE dentro de una comida del plan.
 *
 * Los macros se **copian** del SMAE en el momento de elegirlo en vez de
 * guardar solo una referencia: así el plan escrito hoy conserva sus cifras
 * aunque después actualicen la tabla oficial, y se puede mostrar un plan
 * guardado sin tener que descargar el catálogo completo (hace 416 KB).
 *
 * Los números corresponden a **una porción estándar**; `porciones` dice cuántas
 * de esas se usaron, que es como publica el SMAE y como se mide en casa
 * ("1.5 taza", no "147 g").
 */
export interface PlanFood {
  /** Nombre del alimento, tal como lo publica el SMAE. */
  nombre: string;
  /** Grupo de intercambio: Verdura, Frutas, Cereales sin grasa… */
  categoria: string;
  /** Porciones del SMAE. 1 = una porción estándar; 0.5 = media. */
  porciones: number;
  /** Unidad de esa porción estándar, para escribir "1.5 taza". */
  unidad: string;
  /** Energía por porción. null = sin dato, nunca 0. */
  kcal: number | null;
  /** Proteína (g) por porción. */
  proteina: number | null;
  /** Lípidos (g) por porción. */
  lipidos: number | null;
  /** Hidratos de carbono (g) por porción. */
  hidratos: number | null;
  /** Fibra (g) por porción. */
  fibra?: number | null;
}

/** Totales de macros de una comida o de un día. */
export interface MealMacros {
  kcal: number | null;
  proteina: number | null;
  lipidos: number | null;
  hidratos: number | null;
}

export interface Meal {
  nombre: string;
  hora: string;
  descripcion: string;
  /**
   * Texto libre de alimentos. LEGADO: se conserva para los planes escritos
   * antes de que el SMAE alimentara el plan, y para notas que no vienen de
   * la tabla. Lo que se elige del catálogo va en `items`.
   */
  alimentos: string;
  /**
   * Alimentos del catálogo SMAE, con sus macros.
   *
   * Opcional porque los planes existentes no lo traen.
   */
  items?: PlanFood[];
  /** LEGADO: totales escritos a mano. Los planes nuevos los calculan de `items`. */
  proteinas?: number;
  carbohidratos?: number;
  grasas?: number;
  calorias?: number;
}

export interface MealDay {
  dia: number;
  comidas: Meal[];
}

export interface MealPlan {
  days: MealDay[];
}

/**
 * Un menú guardado — un documento de la colección `meal_plans`.
 *
 * Va en una colección **top-level con `uID`** (el patrón de
 * `body_composition`) y no como subcolección dentro de `players` por dos
 * motivos: el perfil ya concentra anamnesis, actividad, el registro de 24 h y
 * los planes, y meterle una lista entera de menús lo acercaría al límite de
 * 1 MB del documento; y así las reglas del plan quedan aparte del `hasOnly` de
 * `players`, que es enorme.
 *
 * Un menú por documento —y no todos dentro de uno— hace que guardar uno no
 * reescriba los demás ni acumule tamaño, sin techo de cuántos menús puede
 * acumular un paciente seguido durante años.
 */
export interface StoredMealPlan extends MealPlan {
  /** id autogenerado del documento en `meal_plans`. */
  id: string;
  /** uid del paciente al que pertenece el menú. */
  uID: string;
  /** Nombre con el que se lista: "Menú semanal", "Ajuste 12 mar". */
  nombre: string;
  /** Nota breve del menú para quien lo abre de la lista. */
  descripcion?: string;
  /** Cuándo se creó, en epoch ms. Las reglas lo guardan como `timestamp`. */
  createdAt: number;
  /** Quién lo creó. Requerido por las reglas; siempre el nutriólogo. */
  createdBy: string;
}

/** Redondea a un decimal: los porcentajes sin control se ven como 43.6666667. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Redondea un total ya acumulado.
 *
 * Cada alimento se redondea al sumarlo, pero `2.2 + 1.1` en coma flotante da
 * `3.3000000000000003`; sin este paso la pantalla mostraría esos decos de
 * más. Los `null` pasan tal cual: siguen significando "sin dato", no 0.
 */
function roundTotals(macros: MealMacros): MealMacros {
  return {
    kcal: macros.kcal == null ? null : round1(macros.kcal),
    proteina: macros.proteina == null ? null : round1(macros.proteina),
    lipidos: macros.lipidos == null ? null : round1(macros.lipidos),
    hidratos: macros.hidratos == null ? null : round1(macros.hidratos),
  };
}

/**
 * Macros de un alimento, ya multiplicadas por las porciones elegidas.
 *
 * `null` es "sin dato" y **no es 0**: si la tabla no trae la proteína de un
 * alimento, contarla como 0 bajaría el total del día en silencio y el plan
 * diría menos proteína de la que realmente lleva.
 */
export function planFoodMacros(food: PlanFood): MealMacros {
  const portions = food.porciones > 0 ? food.porciones : 0;
  const scale = (value: number | null | undefined): number | null =>
    value == null ? null : round1(value * portions);

  return {
    kcal: scale(food.kcal),
    proteina: scale(food.proteina),
    lipidos: scale(food.lipidos),
    hidratos: scale(food.hidratos),
  };
}

/**
 * Macros de una comida.
 *
 * Si tiene alimentos estructurados se calculan a partir de ellos. Si no —
 * planes escritos antes del SMAE— se cae a los totales que traía escritos a
 * mano, en vez de devolver vacío y borrar de la vista algo que sí existía.
 */
export function mealMacros(meal: Meal): MealMacros {
  const items = meal.items;
  if (!items || items.length === 0) {
    return roundTotals({
      kcal: meal.calorias ?? null,
      proteina: meal.proteinas ?? null,
      hidratos: meal.carbohidratos ?? null,
      lipidos: meal.grasas ?? null,
    });
  }

  let kcal: number | null = null;
  let proteina: number | null = null;
  let lipidos: number | null = null;
  let hidratos: number | null = null;

  for (const food of items) {
    const macros = planFoodMacros(food);
    kcal = sumMacro(kcal, macros.kcal);
    proteina = sumMacro(proteina, macros.proteina);
    lipidos = sumMacro(lipidos, macros.lipidos);
    hidratos = sumMacro(hidratos, macros.hidratos);
  }

  return roundTotals({ kcal, proteina, lipidos, hidratos });
}

/** Macros de todo un día: suma las comidas que sí tienen dato. */
export function dayMacros(day: MealDay): MealMacros {
  let kcal: number | null = null;
  let proteina: number | null = null;
  let lipidos: number | null = null;
  let hidratos: number | null = null;

  for (const meal of day.comidas) {
    const macros = mealMacros(meal);
    kcal = sumMacro(kcal, macros.kcal);
    proteina = sumMacro(proteina, macros.proteina);
    lipidos = sumMacro(lipidos, macros.lipidos);
    hidratos = sumMacro(hidratos, macros.hidratos);
  }

  return roundTotals({ kcal, proteina, lipidos, hidratos });
}
