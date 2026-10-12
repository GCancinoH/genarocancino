import { inject, Injectable, signal, computed, effect, Signal } from '@angular/core';
import { authState, updateProfile, User } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { collection, doc, Firestore, getDoc, getDocs, increment, onSnapshot, query, setDoc, updateDoc, where } from '@angular/fire/firestore';
import { Player } from '../models/player/player';
import { PlayerRewardsModel } from '../models/player/player-rewards';
import { Observable } from 'rxjs';
import { NgSignalDBService } from 'ng-signal-db';
import { resource, Resource } from '../models/resource';

@Injectable({ providedIn: 'root' })
export class PlayerRepository {
  private readonly auth = inject(Auth);
  private readonly db = inject(Firestore);
  private readonly idb = inject(NgSignalDBService);

  readonly currentUser = toSignal(authState(this.auth));

  // Signal propio — fuente de verdad para la UI
  private readonly _rewards = signal<PlayerRewardsModel | undefined>(undefined);

  // Lo que la UI consume
  readonly playerRewards = computed(() => ({
    status: 'success' as const,
    data: this._rewards()
  }));

  private firestoreUnsub?: () => void;

  constructor() {
    effect(() => {
      const user = this.currentUser();
      this.stopSync();
      if (user) this.startSync(user.uid);
      else this._rewards.set(undefined);
    });
  }

  getPlayer() {
    return this.currentUser();
  }

  async getPlayerCustomClaims() {
    return await this.auth.currentUser?.getIdTokenResult()
      .then((idTokenResult) => {
        return idTokenResult.claims;
      })
      .catch((error) => {
        console.log(error);
      });
  }

  async updatePlayerProfile(data: Pick<User, 'displayName' | 'photoURL'>): Promise<Resource<void>> {
    const user = this.auth.currentUser;
    if (!user) return resource.error('No authenticated user');
    try {
      await updateProfile(user, data);
      return resource.success();
    } catch (err: any) {
      return resource.error(err.message, undefined, err);
    }
  }

  async updatePlayerRewardsXPCoins(xp: number, coins: number): Promise<Resource<void>> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return resource.error('No authenticated user');

    try {
      // Optimistic update inmediato en UI
      const current = this._rewards();
      if (current) {
        this._rewards.set({
          ...current,
          xp: current.xp + xp,
          coins: current.coins + coins,
        });
      }

      await updateDoc(doc(this.db, `player_rewards/${uid}`), {
        xp: increment(xp),
        coins: increment(coins),
      });

      // onSnapshot traerá el valor real de Firestore
      return resource.success();
    } catch (err: any) {
      return resource.error(err.message, undefined, err);
    }
  }

  private async startSync(uid: string) {
    // 1. Cargar inmediatamente desde IDB (offline-first)
    const local = await this.idb.db.player_rewards.getOne(uid) as PlayerRewardsModel | undefined;
    if (local) {
      this._rewards.set(local);
      console.log('[PlayerRepo] Loaded from IDB:', local);
    }

    // 2. Suscribirse a Firestore para sincronizar
    const docRef = doc(this.db, `player_rewards/${uid}`);
    this.firestoreUnsub = onSnapshot(
      docRef,
      async (snapshot) => {
        if (snapshot.metadata.fromCache && local) return;

        if (!snapshot.exists()) {
          const defaultData = { xp: 0, level: 0, coins: 0 };
          if (!snapshot.metadata.fromCache) {
            await setDoc(docRef, defaultData);
          }
          const merged = { ...defaultData, uid };
          await this.idb.db.player_rewards.put(merged);
          this._rewards.set(merged);
          return;
        }

        const data = snapshot.data() as PlayerRewardsModel;
        const merged = { ...data, uid };

        // Persistir en IDB y actualizar signal
        await this.idb.db.player_rewards.put(merged);
        this._rewards.set(merged);

        console.log('[PlayerRepo] Synced from Firestore:', merged);
      },
      (error) => {
        console.error('[PlayerRepo] Firestore error, using IDB:', error);
        // La UI sigue mostrando los datos de IDB sin cambios
      }
    );
  }

  signOut() {
    this.auth.signOut();
  }

  private stopSync() {
    this.firestoreUnsub?.();
    this.firestoreUnsub = undefined;
  }

}
