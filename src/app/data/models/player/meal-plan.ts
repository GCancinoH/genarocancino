export interface Meal {
  nombre: string;
  hora: string;
  descripcion: string;
  alimentos: string;
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
