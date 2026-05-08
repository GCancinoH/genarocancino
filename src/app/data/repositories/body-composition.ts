import { inject, Injectable } from '@angular/core';
import { addDoc, collection, Firestore } from '@angular/fire/firestore';
import { BodyCompositionModel } from '../models/body-composition';
import { resource, Resource } from '../models/resource';

@Injectable({
  providedIn: 'root',
})
export class BodyCompositionRepository {
  private readonly db = inject(Firestore);

  async saveBodyComposition(data: BodyCompositionModel | Partial<BodyCompositionModel>): Promise<Resource<void>> {
    try {
      const collectionRef = collection(this.db, 'body_composition');
      await addDoc(collectionRef, data);
      return resource.success();
    } catch (error) {
      console.error('Error saving body composition:', error);
      return resource.error('Failed to save body composition data', undefined, error);
    }
  }
}
