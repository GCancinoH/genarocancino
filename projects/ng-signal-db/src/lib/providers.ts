import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { NgSignalDBConfig, NgSignalDBPlugin } from './core/types';
import { NgSignalDBService } from './api/db.service';
import { NG_SIGNAL_DB_CONFIG, NG_SIGNAL_DB_PLUGINS } from './tokens';

export function provideNgSignalDB(config: NgSignalDBConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    NgSignalDBService,
    { provide: NG_SIGNAL_DB_CONFIG, useValue: config }
  ]);
}

export function provideNgSignalDBPlugin(plugin: NgSignalDBPlugin): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: NG_SIGNAL_DB_PLUGINS, useValue: plugin, multi: true }
  ]);
}
