import { signal } from "@angular/core";

export interface BodyCompositionModel {
  uID: string;
  date: Date;
  weight: number;
  bmi: number;
  muscleMassPercentage: number;
  fatMassPercentage: number;
  bodyAge: number;
  visceralFat: number;
}

export const bodyCompositionModel = signal<BodyCompositionModel>({
  uID: '',
  date: new Date(),
  weight: 0.0,
  bmi: 0.0,
  muscleMassPercentage: 0.0,
  fatMassPercentage: 0.0,
  bodyAge: 0,
  visceralFat: 0
});
