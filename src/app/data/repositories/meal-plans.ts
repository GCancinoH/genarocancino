import { inject, Service } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  addDoc,
  collection,
  doc,
  Firestore,
  getDocs,
  query,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { MealDay, StoredMealPlan } from '../models/player/meal-plan';
import { resource, Resource } from '@data/models/resource';
import { timestampToMillis, toFirestore } from '@data/services/firestore-plain';

/**
 * Datos clínicos de un menú nuevo.
 *
 * `createdBy` y `createdAt` no están: los pone el repositorio, porque son
 * metadatos y quien llama no tiene por qué acordarse de rellenarlos (olvidar
 * uno hace fallar la escritura contra las reglas).
 */
export interface NewMealPlan {
  uID: string;
  nombre: string;
  descripcion?: string;
  days: MealDay[];
}

/**
 * Repositorio de los menús guardados en `meal_plans`.
 *
 * Colección **top-level con `uID`** —el patrón de `body_composition`— y un
 * documento por menú, en vez de una subcolección dentro de `players` ni una
 * lista dentro del perfil: cada menú queda independiente, guardar uno no
 * reescribe los demás, y no hay techo de cuántos puede acumular un paciente
 * seguido durante años.
 *
 * No monta espejo en IndexedDB. Firestore corre con `persistentLocalCache`
 * (ver `app.config.ts`), así que su propia caché persistente devuelve los
 * menús leídos antes cuando no hay red y encola las escrituras hasta que
 * vuelva la conexión. Un espejo aparte duplicaría ese mismo dato.
 */
@Service()
export class MealPlansRepository {
  private readonly db = inject(Firestore);
  private readonly auth = inject(Auth);

  /**
   * Menús de un paciente, del más reciente al más antiguo.
   *
   * Se ordena en el cliente a propósito. Con `where('uID', ...)` como único
   * filtro, Firestore se sirve del índice de campo simple y no hace falta
   * declarar un índice compuesto —que tendría que estar ya desplegado en
   * producción antes de que la primera consulta pudiera correr—. Con unos
   * pocos menús por paciente, ordenar en cliente es de saldo cero.
   */
  async list(uID: string): Promise<Resource<StoredMealPlan[]>> {
    try {
      const snapshot = await getDocs(
        query(collection(this.db, 'meal_plans'), where('uID', '==', uID))
      );

      const plans = snapshot.docs.map((entry) => this.readPlan(entry.id, entry.data()));
      plans.sort((a, b) => b.createdAt - a.createdAt);

      return resource.success(plans);
    } catch (error: any) {
      // Sin conexión y sin caché de este paciente. Se avisa en vez de
      // devolver lista vacía: vacía también significa "no tiene menús" y son
      // dos situaciones distintas para quien las vea.
      return resource.error<StoredMealPlan[]>(
        error.message || 'No se pudieron cargar los menús',
        [],
        error
      );
    }
  }

  /** Crea un menú y devuelve su id. */
  async create(input: NewMealPlan): Promise<Resource<string>> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      // Las reglas exigen `createdBy == request.auth.uid` además de admin:
      // sin sesión el error de Firestore sería un 403 críptico.
      return resource.error<string>('No hay sesión iniciada: el menú no se guardó.');
    }

    try {
      const created = await addDoc(
        collection(this.db, 'meal_plans'),
        toFirestore({ ...input, createdBy: uid, createdAt: Date.now() })
      );
      return resource.success(created.id, 'Menú creado');
    } catch (error: any) {
      return resource.error<string>(error.message || 'No se pudo crear el menú', undefined, error);
    }
  }

  /**
   * Guarda cambios en un menú existente.
   *
   * Solo nombre, nota y días: `uID`, `createdBy` y `createdAt` son
   * inmutables en las reglas, y enviarlos aquí sería un intento de mover un
   * menú de paciente que las reglas rechazan igualmente.
   */
  async save(
    id: string,
    changes: { nombre?: string; descripcion?: string; days?: MealDay[] }
  ): Promise<Resource<void>> {
    try {
      await setDoc(doc(this.db, 'meal_plans', id), toFirestore(changes), { merge: true });
      return resource.success();
    } catch (error: any) {
      return resource.error<void>(error.message || 'No se pudo guardar el menú', undefined, error);
    }
  }

  /** Reconstruye el modelo desde lo que trae Firestore. */
  private readPlan(id: string, data: any): StoredMealPlan {
    return {
      ...data,
      id,
      days: Array.isArray(data.days) ? data.days : [],
      // epoch ms, como espera el modelo. `toFirestore` vuelve a convertirlo a
      // `Timestamp` si se reescribe, así que el ida y vuelta es estable.
      createdAt: timestampToMillis(data.createdAt) ?? 0,
      createdBy: data.createdBy ?? '',
    } as StoredMealPlan;
  }
}
