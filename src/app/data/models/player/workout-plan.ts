export interface Exercise {
  nombre: string;
  series: number;
  repeticiones: string;
  descanso: string;
  notas: string;
}

export interface WorkoutDay {
  dia: number;
  ejercicios: Exercise[];
}

export interface WorkoutPlan {
  days: WorkoutDay[];
}
