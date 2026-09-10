import { signal } from "@angular/core";

export interface NewPlayer {
  nombre: string;
  edad: number;
  correo: string;
}

export const newPlayerModel = signal<NewPlayer>({
  nombre: '',
  edad: 18,
  correo: ''
});
