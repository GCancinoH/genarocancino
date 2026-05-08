import { InjectionToken } from '@angular/core';
import { NgSignalDBConfig, NgSignalDBPlugin } from './core/types';

export const NG_SIGNAL_DB_CONFIG = new InjectionToken<NgSignalDBConfig>('NG_SIGNAL_DB_CONFIG');
export const NG_SIGNAL_DB_PLUGINS = new InjectionToken<NgSignalDBPlugin[]>('NG_SIGNAL_DB_PLUGINS');
