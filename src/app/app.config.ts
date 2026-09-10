import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import {
  getAnalytics,
  provideAnalytics,
  ScreenTrackingService,
  UserTrackingService,
} from '@angular/fire/analytics';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { IDB_ENGINE_FACTORY, MainThreadEngine, NgSignalDBConfig, provideNgSignalDB } from 'ng-signal-db';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideFirebaseApp(() =>
      initializeApp({
        apiKey: "AIzaSyDdvW6dYcCOgtFH2eFfUCDEDEiUf_HYenQ",
        authDomain: "gc-nutrition.firebaseapp.com",
        projectId: "gc-nutrition",
        storageBucket: "gc-nutrition.firebasestorage.app",
        messagingSenderId: "188236069211",
        appId: "1:188236069211:web:955a7151e007dd1f18827e",
        measurementId: "G-KB7Y6YHX4Q"
      }),
    ),
    provideAuth(() => getAuth()),
    provideAnalytics(() => getAnalytics()),
    ScreenTrackingService,
    UserTrackingService,
    provideFirestore(() => getFirestore()),
    provideMessaging(() => getMessaging()),
    provideStorage(() => getStorage()),
    provideNgSignalDB({
      dbName: 'ascenso',
      version: 2,
      stores: {
        players: { keyPath: 'id' },
        player_rewards: {
          keyPath: 'uid',
          indexes: [{ name: 'needsSync', keyPath: 'needsSync', unique: false }]
        }
      }
    }),
    {
      provide: IDB_ENGINE_FACTORY,
      useValue: (config: NgSignalDBConfig) => new MainThreadEngine(config)
    }
  ],
};
