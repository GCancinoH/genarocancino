import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { NgSignalDBConfig } from '../core/types';
import { NgSignalDBService } from '../api/db.service';
import { NG_SIGNAL_DB_CONFIG } from '../tokens';
import { IDB_ENGINE_FACTORY } from '../engine-factory';
import { MainThreadEngine } from '../core/main-thread-engine';

export function provideNgSignalDBTesting(config: NgSignalDBConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    NgSignalDBService,
    { provide: NG_SIGNAL_DB_CONFIG, useValue: config },
    { 
      provide: IDB_ENGINE_FACTORY, 
      useValue: (config: NgSignalDBConfig) => new MainThreadEngine(config) 
    }
  ]);
}
