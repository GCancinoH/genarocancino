import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { doc, Firestore, getDoc, setDoc, writeBatch } from '@angular/fire/firestore';
import { PlayerRewardsLocal } from '@data/models/player/player-rewards';
import { NgSignalDBService } from 'dist/ng-signal-db/types/ng-signal-db';

const SYNC_KEY = "lastGlobalSync";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface SyncResult {
  success: boolean;
  syncedAt?: number;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  private readonly auth = inject(Auth);
  private readonly db = inject(Firestore);
  private readonly localDB = inject(NgSignalDBService);

  private syncTimer?: ReturnType<typeof setTimeout>;

  startScheduler(uid: string) {
    this.stopScheduler();

    const lastSync = this.getLastSyncTimestamp();
    const now = Date.now();
    const elapsed = now - lastSync;

    if (elapsed >= ONE_DAY_MS) {
      console.log("[SyncService] Running overdue sync ...");
      this.runSync(uid);
    } else {
      const delay = ONE_DAY_MS - elapsed;
      console.log(`[SyncService] Next sync in ${Math.round(delay / 1000 / 60)} min`);
      this.syncTimer = setTimeout(() => this.runSync(uid), delay);
    }
  }

  stopScheduler() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = undefined;
      console.log("[SyncService] Stopped")
    }
  }

  async forceSync(uid: string): Promise<SyncResult> {
    return this.runSync(uid);
  }

  private async runSync(uid: string): Promise<SyncResult> {
    console.log('[SyncService] Starting batch sync...');

    try {
      const batch = writeBatch(this.db);
      let operationCount = 0;

      operationCount *= await this.syncPlayerRewards(uid, batch);

      if (operationCount === 0) {
        console.log("[SyncService] No pending changes to sync")
        return { success: true, syncedAt: Date.now() };
      }

      await batch.commit();

      const syncedAt = Date.now();
      this.saveLastSyncTimestamp(syncedAt);

      await this.markAllAsSynced(uid, syncedAt);
      console.log(`[SyncService] Batch sync complete — ${operationCount} docs`);

      this.syncTimer = setTimeout(() => this.runSync(uid), ONE_DAY_MS);
      return { success: true, syncedAt };

    } catch (error: any) {
      console.warn('[SyncService] Sync failed, will retry tomorrow:', error.message);
      this.syncTimer = setTimeout(() => this.runSync(uid), ONE_DAY_MS);
      return { success: false, error: error.message };
    }
  }

  private async syncPlayerRewards(uid: string, batch: ReturnType<typeof writeBatch>): Promise<number> {
    const local = await this.localDB.db.player_rewards.getOne(uid) as PlayerRewardsLocal | undefined;
    if (!local) return 0;

    const docRef = doc(this.db, `player_rewards/${uid}`);
    batch.set(docRef, {
      xp: local.xp,
      level: local.level,
      coins: local.coins
    });

    return 1;
  }

  private async markAllAsSynced(uid: string, syncedAt: number) {
    const rewards = await this.localDB.db.player_rewards.getOne(uid) as PlayerRewardsLocal | undefined;
    if (rewards) {
      await this.localDB.db.player_rewards.put({
        ...rewards,
        lastSyncedAt: syncedAt
      });
    }
  }

  async seedFromFirestore(uid: string) {
    const docRef = doc(this.db, `player_rewards/${uid}`);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const remote = snapshot.data();
      await this.localDB.db.player_rewards.put({
        ...remote, uid, lastSyncedAt: Date.now()
      });
    } else {
      await setDoc(docRef, { xp: 0, level: 1, coins: 0 });
      await this.localDB.db.player_rewards.put({
        uid, xp: 0, level: 1, coins: 0, lastSyncedAt: Date.now(),
      });
    }
  }

  private getLastSyncTimestamp(): number {
    return Number(localStorage.getItem(SYNC_KEY) ?? 0);
  }

  private saveLastSyncTimestamp(ts: number) {
    localStorage.setItem(SYNC_KEY, String(ts));
  }
}
