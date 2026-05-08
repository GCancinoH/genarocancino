import { signal } from "@angular/core";

export interface SleepModel {
    uID: string | undefined;
    date: Date;
    duration: string;
    from: string;
    to: string;
    rem: string;
    deep: string;
    light: string;
    wakeUps: number;
    avgHR: number;
    avgspo2: number;
}

export const sleepModel = signal<SleepModel>({
    uID: '',
    date: new Date(),
    duration: '',
    from: '',
    to: '',
    rem: '',
    deep: '',
    light: '',
    wakeUps: 0,
    avgspo2: 0,
    avgHR: 0
});

