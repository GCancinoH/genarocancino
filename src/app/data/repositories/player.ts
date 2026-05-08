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

@Injectable({
  providedIn: 'root',
})
export class PlayerRepository {
  // injects
  private readonly auth = inject(Auth);
  private readonly db = inject(Firestore);
  private readonly dbService = inject(NgSignalDBService);

  // signals
  private readonly user = toSignal(authState(this.auth));
  private player = toSignal(authState(this.auth));

  constructor() {
    // Automatically manage sync based on auth state
    effect(() => {
      const user = this.user();
      if (user) {
        this.startSync(user.uid);
      } else {
        this.stopSync();
      }
    });
  }

  /*getPlayer() {
    const currentUser = this.user();
    if (!currentUser) return;

    const player: Player = {
      uid: currentUser.uid,
      displayName: currentUser.displayName,
      email: currentUser.email,
      photoURL: currentUser.photoURL,
      createdAt: currentUser.metadata.creationTime,
    }

    return player;
  }*/

  getPlayer() {
    return this.player();
  }

  async updatePlayerProfile(data: Partial<User>) {
    const user = this.auth.currentUser;
    if (!user) return;

    const { displayName, photoURL } = data;

    try {
      await updateProfile(user, { displayName, photoURL });
      console.log("Profile updated successfully for player " + user.uid + ". Data: " + displayName);
    } catch (error) {
      console.error(error);
    }

  }

  getPlayerRewards(): Signal<PlayerRewardsModel | null> {
    const id = this.auth.currentUser?.uid;
    if (!id) null;

    let signalData = signal<PlayerRewardsModel | null>(null);
    const rewardDocument = doc(this.db, `player_rewards/${id}`);
    onSnapshot(rewardDocument, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as PlayerRewardsModel;
        signalData.set(data);
      }
    });

    return signalData;
  }

  async updatePlayerRewardsXPCoins(xp: number, coins: number): Promise<Resource<void>> {
    const id = this.auth.currentUser?.uid;
    if (!id) return resource.error("There is not an associated player");

    try {
      const rewardDocument = doc(this.db, `player_rewards/${id}`);

      await updateDoc(rewardDocument, {
        xp: increment(xp),
        coins: increment(coins)
      });
      return resource.success(undefined, "Datos guardados exitosamente.");
    } catch (error: any) {
      console.error(error);
      return resource.error(error.message || "Failed to update rewards", undefined, error);
    }
  }


  // ... (getPlayerAttributesDataForFirestore stays same)

  getPlayerRewardsSignal() {
    // We pass a function that returns the UID.
    // The library handles the reactivity internally and ensures a stable Signal.
    return this.dbService.db.player_rewards.get(() => this.user()?.uid);
  }

  private firestoreSyncUnsubscribe?: () => void;

  private startSync(uid: string) {
    this.stopSync();

    const docRef = doc(this.db, `player_rewards/${uid}`);
    this.firestoreSyncUnsubscribe = onSnapshot(docRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as PlayerRewardsModel;
        console.log('[PlayerRepository] Firestore Update:', data);
        await this.dbService.db.player_rewards.put({ ...data, uid });
      } else {
        const defaultData = { xp: 0, level: 0, coins: 0 };
        setDoc(docRef, defaultData);
        await this.dbService.db.player_rewards.put({ ...defaultData, uid });
      }
    });
  }

  private stopSync() {
    if (this.firestoreSyncUnsubscribe) {
      this.firestoreSyncUnsubscribe();
      this.firestoreSyncUnsubscribe = undefined;
    }
  }
}


