import { inject, Injectable } from '@angular/core';
import { addDoc, collection, Firestore, getDocs, query, where } from '@angular/fire/firestore';
// Repositories
import { PlayerRepository } from './player';
import { SleepModel } from '../models/sleep';
import { Auth } from '@angular/fire/auth';
import { resource, Resource } from '../models/resource';

@Injectable({
  providedIn: 'root',
})
export class SleepRepository {
  // inject
  private readonly db = inject(Firestore);
  private readonly player = inject(PlayerRepository);
  private readonly auth = inject(Auth);

  async saveSleepData(data: SleepModel | Partial<SleepModel>): Promise<Resource<void>> {
    try {
      const collectionRef = collection(this.db, 'sleep');
      const result = await addDoc(collectionRef, data);
      console.log("Document written with ID: ", result.id)
      return resource.success();
    } catch (error) {
      console.error(error);
      return resource.error("Failed to save sleep data", undefined, error);
    }
  }

  async getSleepData() { }

  async isDataAvailable(): Promise<Boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const player = this.auth.currentUser;

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const q = query(
      collection(this.db, 'sleep'),
      where('uID', '==', player?.uid),
      where('date', '>=', today),
      where('date', '<', tomorrow)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  }


}
