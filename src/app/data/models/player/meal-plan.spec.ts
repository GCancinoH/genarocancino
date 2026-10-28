import {
  Meal,
  MealDay,
  PlanFood,
  dayMacros,
  mealMacros,
  planFoodMacros,
} from './meal-plan';

/** Alimento con los valores de "Acelga cruda" del SMAE, sobreescribibles. */
function food(overrides: Partial<PlanFood> = {}): PlanFood {
  return {
    nombre: 'Acelga cruda',
    categoria: 'Verdura',
    porciones: 1,
    unidad: 'taza',
    kcal: 22,
    proteina: 2.2,
    lipidos: 0.1,
    hidratos: 4.3,
    ...overrides,
  };
}

function meal(overrides: Partial<Meal> = {}): Meal {
  return { nombre: 'Desayuno', hora: '07:00', descripcion: '', alimentos: '', ...overrides };
}

describe('meal-plan', () => {
  describe('planFoodMacros', () => {
    it('multiplica los macros por las porciones elegidas', () => {
      // 1.5 taza = 33 kcal, 3.3 g de proteína
      const macros = planFoodMacros(food({ porciones: 1.5 }));

      expect(macros.kcal).toBe(33);
      expect(macros.proteina).toBe(3.3);
      expect(macros.hidratos).toBe(6.5);
    });

    /**
     * `null` es "sin dato" y no es 0: si un alimento sin dato de proteína se
     * contara como 0, el total del día saldría por debajo de lo que realmente
     * lleva el plan y nadie vería el error.
     */
    it('no convierte los datos faltantes en cero', () => {
      const macros = planFoodMacros(food({ porciones: 2, proteina: null }));

      expect(macros.proteina).toBeNull();
      expect(macros.kcal).toBe(44); // los datos conocidos sí se escalan
    });

    it('las porciones vacías o negativas no aportan nada', () => {
      expect(planFoodMacros(food({ porciones: 0 })).kcal).toBe(0);
      expect(planFoodMacros(food({ porciones: -2 })).kcal).toBe(0);
    });
  });

  describe('mealMacros', () => {
    it('suma los alimentos estructurados', () => {
      const macros = mealMacros(
        meal({
          items: [food({ porciones: 1 }), food({ nombre: 'Brócoli crudo', porciones: 0.5, kcal: 19, proteina: 2.1, lipidos: 0.3, hidratos: 3.7 })],
        })
      );

      expect(macros.kcal).toBe(31.5); // 22 + 9.5
      expect(macros.proteina).toBe(3.3); // 2.2 + 1.05 → redondeado
      expect(macros.hidratos).toBe(6.2); // 4.3 + 1.85 → redondeado
    });

    /**
     * Los planes escritos antes de que el SMAE alimentara el plan traen los
     * totales escritos a mano y ningún `items`. Devolverles vacío borraría de
     * la vista datos que sí existían.
     */
    it('cae a los totales escritos a mano cuando no hay alimentos estructurados', () => {
      const legacy = meal({ calorias: 500, proteinas: 30, carbohidratos: 55, grasas: 15 });

      expect(mealMacros(legacy)).toEqual({
        kcal: 500,
        proteina: 30,
        hidratos: 55,
        lipidos: 15,
      });
      // Un `items` vacío cuenta como "sin alimentos estructurados".
      expect(mealMacros(meal({ items: [], calorias: 500 })).kcal).toBe(500);
    });

    it('devuelve null, no cero, cuando nada tiene dato', () => {
      const macros = mealMacros(meal());

      expect(macros.kcal).toBeNull();
      expect(macros.proteina).toBeNull();
      expect(macros.lipidos).toBeNull();
      expect(macros.hidratos).toBeNull();
    });
  });

  describe('dayMacros', () => {
    it('suma las comidas del día', () => {
      const day: MealDay = {
        dia: 1,
        comidas: [meal({ items: [food({ porciones: 2 })] }), meal({ nombre: 'Comida', items: [food({ porciones: 1 })] })],
      };

      expect(dayMacros(day).kcal).toBe(66); // 44 + 22
    });

    /**
     * Una comida sin datos no debe arrastrar el total a 0: el resto del día sí
     * tiene macros conocidos y mostrar 0 diría que el plan no aporta nada.
     */
    it('una comida sin datos no arrastra el total a cero', () => {
      const day: MealDay = { dia: 1, comidas: [meal({ items: [food({ porciones: 2 })] }), meal()] };

      expect(dayMacros(day).kcal).toBe(44);
      expect(dayMacros(day).proteina).toBe(4.4);
    });

    it('un día entero sin datos queda en null, no en cero', () => {
      const macros = dayMacros({ dia: 1, comidas: [meal(), meal()] });

      expect(macros.kcal).toBeNull();
    });
  });
});
