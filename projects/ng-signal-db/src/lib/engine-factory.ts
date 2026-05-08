import { InjectionToken } from '@angular/core';
import { IdbEngine, NgSignalDBConfig } from './core/types';
import { WorkerEngine } from './core/worker-engine';
import { MainThreadEngine } from './core/main-thread-engine';

export const IDB_ENGINE_FACTORY = new InjectionToken<(config: NgSignalDBConfig) => IdbEngine>('IDB_ENGINE_FACTORY', {
  providedIn: 'root',
  factory: () => (config: NgSignalDBConfig) => new WorkerEngine(config)
});
