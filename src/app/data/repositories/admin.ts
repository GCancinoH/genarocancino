import { inject, Service } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { collection, doc, Firestore, onSnapshot, setDoc, getDoc } from '@angular/fire/firestore';
import { firstValueFrom, Observable } from 'rxjs';
import { NewPlayer } from '../models/player/new-player';
import { MealPlan } from '../models/player/meal-plan';
import { WorkoutPlan } from '../models/player/workout-plan';
import { resource, Resource } from '@data/models/resource';

export interface PlayerRecord {
  uid: string;
  displayName: string | null;
  email: string | null;
  /** Teléfono capturado en el alta. Lo usa el botón de WhatsApp. */
  phone?: string | null;
  customClaims: any;
  disabled: boolean;
}

export interface PlayerCreationResponse {
  message: string;
  uid: string;
  email: string;
  displayName: string;
  password?: string;
}

type PlayerDocument = Partial<PlayerRecord> & {
  age?: number;
  edad?: number;
  nombre?: string;
  correo?: string;
  telefono?: string;
  premiumAccount?: boolean;
};

@Service()
export class AdminRepository {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly apiUrl = 'https://genarocancino-server.vercel.app/api/v1';

  private async getAuthHeaders(): Promise<HttpHeaders> {
    const token = await this.auth.currentUser?.getIdToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getPlayers(): Observable<Resource<PlayerRecord[]>> {
    return new Observable<Resource<PlayerRecord[]>>((subscriber) => {
      const playersCollection = collection(this.firestore, 'players');

      const unsubscribe = onSnapshot(
        playersCollection,
        (snapshot) => {
          const players = snapshot.docs.map((docSnapshot) => {
            const data = docSnapshot.data() as PlayerDocument;
            const customClaims = data.customClaims ?? {};

            return {
              uid: data.uid ?? docSnapshot.id,
              displayName: data.displayName ?? data.nombre ?? null,
              email: data.email ?? data.correo ?? null,
              customClaims: {
                ...customClaims,
                age: customClaims.age ?? data.age ?? data.edad,
                premiumAccount: customClaims.premiumAccount ?? data.premiumAccount ?? false,
              },
              disabled: data.disabled ?? false,
            } satisfies PlayerRecord;
          });

          subscriber.next(resource.success(players));
        },
        (error) => {
          console.error('Error fetching players:', error);
          subscriber.next(resource.error(error.message || 'Error al obtener la lista de jugadores', undefined, error));
        }
      );

      return unsubscribe;
    });
  }

  async getPlayerById(uid: string): Promise<Resource<PlayerRecord & { age?: number }>> {
    try {
      const docSnap = await getDoc(doc(this.firestore, 'players', uid));
      if (!docSnap.exists()) {
        return resource.error('Jugador no encontrado');
      }
      const data = docSnap.data() as PlayerDocument;
      const customClaims = data.customClaims ?? {};

      return resource.success({
        uid: data.uid ?? docSnap.id,
        displayName: data.displayName ?? data.nombre ?? null,
        email: data.email ?? data.correo ?? null,
        phone: data.phone ?? data.telefono ?? null,
        age: customClaims.age ?? data.age ?? data.edad,
        customClaims: {
          ...customClaims,
          age: customClaims.age ?? data.age ?? data.edad,
          premiumAccount: customClaims.premiumAccount ?? data.premiumAccount ?? false,
        },
        disabled: data.disabled ?? false,
      });
    } catch (error: any) {
      console.error('Error fetching player:', error);
      return resource.error(error.message || 'Error al obtener el jugador', undefined, error);
    }
  }

  async updatePlayer(
    uid: string,
    data: {
      displayName?: string | null;
      email?: string | null;
      phone?: string | null;
      age?: number | null;
      disabled?: boolean;
      premiumAccount?: boolean;
      mealPlan?: MealPlan;
      workoutPlan?: WorkoutPlan;
    }
  ): Promise<Resource<void>> {
    try {
      const updatePayload: { [key: string]: unknown } = {};

      if (data.displayName !== undefined) updatePayload['displayName'] = data.displayName;
      if (data.email !== undefined) updatePayload['email'] = data.email;
      if (data.phone !== undefined) updatePayload['phone'] = data.phone;
      if (data.age !== undefined) updatePayload['age'] = data.age;
      if (data.disabled !== undefined) updatePayload['disabled'] = data.disabled;
      if (data.premiumAccount !== undefined) updatePayload['premiumAccount'] = data.premiumAccount;
      if (data.mealPlan !== undefined) updatePayload['mealPlan'] = data.mealPlan;
      if (data.workoutPlan !== undefined) updatePayload['workoutPlan'] = data.workoutPlan;

      if (Object.keys(updatePayload).length === 0) {
        return resource.success();
      }

      // Use setDoc with merge to safely create or update any field (including nested ones)
      await setDoc(doc(this.firestore, 'players', uid), updatePayload, { merge: true });
      return resource.success();
    } catch (error: any) {
      console.error('Error updating player:', error);
      return resource.error(error.message || 'Error al actualizar el jugador', undefined, error);
    }
  }

  async createPlayer(player: NewPlayer): Promise<Resource<PlayerCreationResponse>> {
    try {
      const headers = await this.getAuthHeaders();
      const payload = {
        displayName: player.nombre,
        email: player.correo,
        edad: player.edad
      };
      const response = await firstValueFrom(
        this.http.post<PlayerCreationResponse>(`${this.apiUrl}/player-creation`, payload, { headers })
      );
      return resource.success(response);
    } catch (error: any) {
      console.error('Error creating player:', error);
      return resource.error(error.error?.error || 'Error al registrar el jugador', undefined, error);
    }
  }
}
