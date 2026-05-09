import { inject, Injectable } from '@angular/core';
// services
import { NgSignalDBService } from 'dist/ng-signal-db/types/ng-signal-db';
// models
import { Player } from '../models/player/player';
import { PlayerRewardsModel } from '../models/player/player-rewards';

@Injectable({
  providedIn: 'root',
})
export class PlayerLocalDB {
  // injects
  private readonly localDB = inject(NgSignalDBService);
  // collections




}
