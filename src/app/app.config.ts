import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withXhr } from '@angular/common/http';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import {
  getAnalytics,
  provideAnalytics,
  ScreenTrackingService,
  UserTrackingService,
} from '@angular/fire/analytics';
// `persistentLocalCache` habilita el modo offline nativo de Firestore:
// las escrituras se hacen contra IndexedDB y se sincronizan solas al
// recuperar la señal. Requiere initializeFirestore (no getFirestore).
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  provideFirestore,
} from '@angular/fire/firestore';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { getStorage, provideStorage } from '@angular/fire/storage';
import {
  IDB_ENGINE_FACTORY,
  MainThreadEngine,
  NgSignalDBConfig,
  provideNgSignalDB,
} from 'ng-signal-db';

export const firebaseApp = initializeApp({
  apiKey: 'AIzaSyDdvW6dYcCOgtFH2eFfUCDEDEiUf_HYenQ',
  authDomain: 'gc-nutrition.firebaseapp.com',
  projectId: 'gc-nutrition',
  storageBucket: 'gc-nutrition.firebasestorage.app',
  messagingSenderId: '188236069211',
  appId: '1:188236069211:web:955a7151e007dd1f18827e',
  measurementId: 'G-KB7Y6YHX4Q',
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withXhr()),
    provideFirebaseApp(() => firebaseApp),
    provideAuth(() => getAuth()),
    provideAnalytics(() => getAnalytics()),
    ScreenTrackingService,
    UserTrackingService,
    provideFirestore(() =>
      initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      })
    ),
    provideMessaging(() => getMessaging()),
    provideStorage(() => getStorage()),
    provideNgSignalDB({
      dbName: 'ascenso',
      version: 3,
      stores: {
        players: { keyPath: 'id' },
        player_rewards: {
          keyPath: 'uid',
          indexes: [{ name: 'needsSync', keyPath: 'needsSync', unique: false }],
        },
        // --- Panel del nutriólogo (espejo local para lectura offline) ---
        // Espejo de players/{uid}. Las fechas se guardan como ISO string
        // porque IndexedDB no conserva la clase Timestamp de Firestore.
        patients: {
          keyPath: 'uid',
          indexes: [
            { name: 'byLastContact', keyPath: 'lastContactAt', unique: false },
            { name: 'byArchived', keyPath: 'archived', unique: false },
          ],
        },
        consultations: {
          keyPath: 'id',
          indexes: [
            { name: 'byPatient', keyPath: 'patientUid', unique: false },
            { name: 'byDate', keyPath: 'date', unique: false },
          ],
        },
        timeline: {
          keyPath: 'id',
          indexes: [{ name: 'byPatient', keyPath: 'patientUid', unique: false }],
        },
        appointments: {
          keyPath: 'id',
          indexes: [
            { name: 'byStart', keyPath: 'start', unique: false },
            { name: 'byPatient', keyPath: 'patientUid', unique: false },
          ],
        },
        // Borradores de alta sin conexión: se vacían al crear la cuenta.
        patient_drafts: { keyPath: 'id' },
      },
    }),
    {
      provide: IDB_ENGINE_FACTORY,
      useValue: (config: NgSignalDBConfig) => new MainThreadEngine(config),
    },
  ],
};
