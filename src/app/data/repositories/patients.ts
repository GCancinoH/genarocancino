import { DestroyRef, Service, Injector, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  QuerySnapshot,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { NgSignalDBService } from 'ng-signal-db';
import { firstValueFrom, Observable } from 'rxjs';
import { resource, Resource } from '@data/models/resource';
import {
  PatientDraft,
  PatientProfile,
} from '@data/models/patient/patient-profile';
import { calculateImc } from '@data/models/patient/patient-labels';
import { ConnectivityService } from '@data/services/connectivity';
import { timestampToMillis, toPlain } from '@data/services/firestore-plain';

export interface CreatePatientResult {
  uid: string;
  email: string;
  displayName: string;
  /** Password temporal. El backend también la manda por correo. */
  password?: string;
  /** Si el backend logró enviar el correo de credenciales. */
  emailSent?: boolean;
  /** Motivo del fallo del correo, si `emailSent` es false. */
  emailError?: string;
  /**
   * Si el expediente clínico se escribió en Firestore.
   * false => la cuenta existe pero el expediente quedó pendiente.
   */
  profileSaved?: boolean;
  /**
   * Si la medición inicial quedó escrita en `body_composition`.
   *
   * `false` => se intentó y falló: el alta está en pie pero quedó sin
   * línea base para comparar.
   * `undefined` => no había medición que guardar (el peso y los
   * porcentajes son opcionales en el alta).
   */
  baselineSaved?: boolean;
}

interface PlayerDocSnapshot extends Partial<PatientProfile> {
  uid?: string;
  displayName?: string | null;
  email?: string | null;
  nombre?: string;
  correo?: string;
  age?: number;
  edad?: number;
  customClaims?: Record<string, unknown>;
  disabled?: boolean;
  premiumAccount?: boolean;
}

/**
 * Repositorio de pacientes del nutriólogo.
 *
 * Diseño offline-first en dos capas:
 *  1. Firestore con `persistentLocalCache` (ver app.config) — las
 *     escrituras se aplican en local y se sincronizan solas al volver la señal.
 *  2. Espejo en IndexedDB (`ng-signal-db`, store `patients`) — permite pintar
 *     la lista al instante y trabajar sin conexión.
 *
 * La UI solo consume signals; nunca toca Firestore directamente.
 */
@Service()
export class PatientsRepository {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly http = inject(HttpClient);
  private readonly idb = inject(NgSignalDBService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  private readonly apiUrl = 'https://genarocancino-server.vercel.app/api/v1';

  // ---------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------
  /** Pacientes conocidos (Firestore + espejo local fusionados). */
  private readonly _patients = signal<PatientProfile[]>([]);
  private readonly _status = signal<'loading' | 'success' | 'error'>('loading');
  private readonly _error = signal<string | null>(null);
  private readonly _drafts = signal<PatientDraft[]>([]);

  readonly patients = this._patients.asReadonly();
  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly drafts = this._drafts.asReadonly();

  // Filtros de la lista (UI)
  readonly searchTerm = signal<string>('');
  readonly tagFilter = signal<string | null>(null);
  readonly showArchived = signal<boolean>(false);
  readonly sortBy = signal<'recent' | 'name' | 'goal'>('recent');

  /** Pacientes tras aplicar búsqueda, filtros y orden. */
  readonly filteredPatients = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const tag = this.tagFilter();
    const includeArchived = this.showArchived();
    const sort = this.sortBy();

    const filtered = this._patients().filter((patient) => {
      if (!includeArchived && patient.archived) return false;

      if (tag && !(patient.tags ?? []).includes(tag)) return false;

      if (!term) return true;

      const haystack = [
        patient.displayName ?? '',
        patient.email ?? '',
        patient.phone ?? '',
        ...(patient.tags ?? []),
        patient.objective?.goal ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'name') return (a.displayName ?? '').localeCompare(b.displayName ?? '');
      if (sort === 'goal') return (a.objective?.goal ?? '').localeCompare(b.objective?.goal ?? '');
      return (b.lastContactAt ?? b.createdAt ?? 0) - (a.lastContactAt ?? a.createdAt ?? 0);
    });
  });

  /** Todos los tags en uso, para pintar los chips de filtro. */
  readonly availableTags = computed(() => {
    const tags = new Set<string>();
    for (const patient of this._patients()) {
      for (const tag of patient.tags ?? []) tags.add(tag);
    }
    return [...tags].sort();
  });

  /** Pacientes que llevan más de `days` días sin contacto. */
  stalePatients(days = 30): PatientProfile[] {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this._patients().filter(
      (patient) => !patient.archived && (patient.lastContactAt ?? patient.createdAt ?? 0) < cutoff
    );
  }

  patientByUid(uid: string): PatientProfile | undefined {
    return this._patients().find((patient) => patient.uid === uid);
  }

  private unsubscribe?: () => void;
  private started = false;

  // ---------------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------------
  start(): void {
    if (this.started) return;
    this.started = true;

    this.hydrateFromCache();
    this.loadDrafts();
    this.subscribeToPatients();

    // Al recuperar la señal, se vacían los borradores pendientes.
    // `effect()` necesita contexto de inyección: `start()` se llama desde
    // ngOnInit, que NO lo es, así que lo proveemos explícitamente.
    effect(
      () => {
        if (this.connectivity.online() && this._drafts().some((draft) => draft.status === 'pending')) {
          void this.flushDrafts();
        }
      },
      { injector: this.injector }
    );

    this.destroyRef.onDestroy(() => this.unsubscribe?.());
  }

  /**
   * Lee todos los registros de un store del espejo local.
   *
   * OJO: el `NgSignalDBService` se expone como un Proxy cuyas propiedades
   * son QueryBuilder (`asSignal()`, `getOne()`, `put()`, `delete()`), NO
   * tiene `getAll()`. Para leer en bloque hay que ir al engine.
   */
  private async readAllFromStore<T>(storeName: string): Promise<T[]> {
    await this.idb.initializedPromise;
    return (await this.idb.activeEngine.getAll<T>(storeName)) ?? [];
  }

  /** Carga el espejo local para pintar la lista al instante (offline-friendly). */
  private async hydrateFromCache(): Promise<void> {
    try {
      const cached = await this.readAllFromStore<PatientProfile>('patients');
      if (Array.isArray(cached) && cached.length) {
        this._patients.set(this.sortByRecency(cached));
        this._status.set('success');
      }
    } catch (error) {
      console.warn('[PatientsRepo] No se pudo leer el espejo local', error);
    }
  }

  /**
   * Suscripción en vivo a `players`. Con `persistentLocalCache` Firestore
   * entrega primero el snapshot desde caché y luego el de servidor, así que
   * esto funciona igual con o sin internet.
   */
  private subscribeToPatients(): void {
    const playersRef = collection(this.firestore, 'players');

    this.unsubscribe = onSnapshot(
      playersRef,
      async (snapshot) => {
        const fromServer = !snapshot.metadata.fromCache;
        const patients: PatientProfile[] = [];

        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data() as PlayerDocSnapshot;
          const plain = toPlain(data) as PlayerDocSnapshot;

          patients.push({
            ...plain,
            uid: plain.uid ?? docSnapshot.id,
            displayName: plain.displayName ?? plain.nombre ?? null,
            email: plain.email ?? plain.correo ?? null,
            age: plain.age ?? plain.edad,
            createdAt: timestampToMillis(plain.createdAt),
            updatedAt: timestampToMillis(plain.updatedAt),
            archivedAt: timestampToMillis(plain.archivedAt),
            lastContactAt: timestampToMillis(plain.lastContactAt),
            lastConsultationAt: timestampToMillis(plain.lastConsultationAt),
          });
        }

        this._patients.set(this.sortByRecency(patients));
        this._status.set('success');
        this._error.set(null);

        // El espejo local solo se actualiza con datos de servidor.
        if (fromServer) {
          await this.mirrorToCache(patients);
          this.connectivity.lastSyncedAt.set(Date.now());
        }
      },
      (error) => {
        console.error('[PatientsRepo] Error en la suscripción', error);
        this._error.set(error.message || 'Error al obtener los pacientes');
        this._status.set('error');
      }
    );
  }

  private sortByRecency(patients: PatientProfile[]): PatientProfile[] {
    return [...patients].sort(
      (a, b) => (b.lastContactAt ?? b.createdAt ?? 0) - (a.lastContactAt ?? a.createdAt ?? 0)
    );
  }

  /** Escribe el snapshot en IndexedDB para las próximas aperturas sin señal. */
  private async mirrorToCache(patients: PatientProfile[]): Promise<void> {
    try {
      await this.idb.initializedPromise;
      const cache = this.idb.db.patients;
      const existing = await this.readAllFromStore<PatientProfile>('patients');
      const incomingUids = new Set(patients.map((patient) => patient.uid));

      await Promise.all(
        existing
          .filter((item) => !incomingUids.has(item.uid))
          .map((item) => cache.delete(item.uid))
      );

      await Promise.all(patients.map((patient) => cache.put(patient)));
    } catch (error) {
      console.warn('[PatientsRepo] Error escribiendo el espejo local', error);
    }
  }

  // ---------------------------------------------------------------------
  // Escrituras
  // ---------------------------------------------------------------------

  /**
   * Guarda (o actualiza) el expediente clínico. Con `merge: true`, así que
   * solo se escriben los campos enviados.
   *
   * Offline: Firestore aplica el cambio en su caché local y lo envía solo
   * cuando vuelve la señal; la UI ya ve el valor nuevo.
   */
  async updatePatient(
    uid: string,
    changes: Partial<Omit<PatientProfile, 'uid'>>
  ): Promise<Resource<void>> {
    try {
      const payload = toPlain({ ...changes, updatedAt: Date.now() }) as Record<string, unknown>;
      await setDoc(doc(this.firestore, 'players', uid), payload, { merge: true });

      // Espejo optimista para que la UI no espere al snapshot.
      this._patients.update((list) =>
        list.map((patient) =>
          patient.uid === uid ? { ...patient, ...changes, updatedAt: Date.now() } : patient
        )
      );
      const local = this.patientByUid(uid);
      if (local) await this.idb.db.patients.put(local);

      return resource.success();
    } catch (error: any) {
      return resource.error(error.message || 'No se pudo guardar el expediente', undefined, error);
    }
  }

  /** Archiva (soft-delete) o restaura un paciente. Nunca se borra el historial. */
  async setArchived(uid: string, archived: boolean): Promise<Resource<void>> {
    return this.updatePatient(uid, {
      archived,
      ...(archived ? { archivedAt: Date.now() } : {}),
    });
  }

  /**
   * Borrado duro e irreversible del paciente.
   *
   * Firestore NO borra las subcolecciones de un documento al borrarlo, así
   * que hay que recogerlas a mano, igual que las referencias sueltas que este
   * paciente deja en `appointments`, `body_composition`, `sleep` y
   * `player_rewards`.
   *
   * El paso final —la cuenta de Auth— pasa por el backend, porque desde el
   * cliente no se puede borrar la cuenta de otro usuario. Va separado: si
   * falla, los datos ya se fueron pero queda una cuenta de acceso viva, y el
   * mensaje tiene que decirlo tal cual.
   */
  async deletePatient(uid: string): Promise<Resource<void>> {
    if (!this.connectivity.online()) {
      return resource.error('Sin conexión: el borrado necesita red.');
    }

    // 1-3 — Firestore
    try {
      await this.deleteByField('appointments', 'patientUid', uid);
      await this.deleteByField('body_composition', 'uID', uid);
      await this.deleteByField('sleep', 'uID', uid);

      // Firestore no falla al borrar un documento inexistente.
      await deleteDoc(doc(this.firestore, 'player_rewards', uid));

      await this.deleteCollection(`players/${uid}/consultations`);
      await this.deleteCollection(`players/${uid}/timeline`);
      await deleteDoc(doc(this.firestore, 'players', uid));

      // Espejo optimista, igual que en updatePatient: no esperar al snapshot.
      this._patients.update((list) => list.filter((patient) => patient.uid !== uid));
      await this.idb.db.patients.delete(uid);
    } catch (error: any) {
      console.error('[PatientsRepo] Borrado del expediente incompleto', error);
      return resource.error(
        'El borrado no se pudo completar. Algún dato del paciente sigue en Firestore; vuelve a intentarlo.',
        undefined,
        error
      );
    }

    // 4 — cuenta de acceso
    try {
      const token = await this.auth.currentUser?.getIdToken();
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });

      await firstValueFrom(
        this.http.post<{ message: string }>(`${this.apiUrl}/player-deletion`, { uid }, { headers })
      );
    } catch (error: any) {
      console.error('[PatientsRepo] Cuenta de Auth sin borrar', error);
      return resource.error(
        'Los datos se borraron, pero la cuenta de acceso sigue activa. Vuelve a intentarlo para eliminarla.',
        undefined,
        error
      );
    }

    return resource.success();
  }

  /** Borra los documentos de una colección cuyo campo coincide con `value`. */
  private async deleteByField(
    collectionName: string,
    field: string,
    value: string
  ): Promise<void> {
    const snapshot = await getDocs(
      query(collection(this.firestore, collectionName), where(field, '==', value))
    );
    await this.deleteSnapshot(snapshot);
  }

  /** Borra todos los documentos de una subcolección. */
  private async deleteCollection(collectionPath: string): Promise<void> {
    const snapshot = await getDocs(collection(this.firestore, collectionPath));
    await this.deleteSnapshot(snapshot);
  }

  /**
   * Borra en tandas: Firestore admite como máximo 500 operaciones por
   * batch, y un paciente con años de consultas lo supera.
   */
  private async deleteSnapshot(snapshot: QuerySnapshot): Promise<void> {
    const CHUNK = 400;
    for (let i = 0; i < snapshot.docs.length; i += CHUNK) {
      const batch = writeBatch(this.firestore);
      for (const docSnap of snapshot.docs.slice(i, i + CHUNK)) {
        batch.delete(docSnap.ref);
      }
      await batch.commit();
    }
  }

  // ---------------------------------------------------------------------
  // Alta de paciente
  // ---------------------------------------------------------------------

  /**
   * Crea la cuenta en el backend (que genera el password temporal y manda el
   * correo) y después escribe el expediente clínico.
   *
   * Requiere conexión: el hash de la contraseña y el correo los resuelve el
   * servidor. Sin señal, usar `saveDraft()` + `flushDrafts()`.
   */
  /**
   * Escribe la medición inicial del paciente en `body_composition`.
   *
   * Es la misma colección a la que el paciente registra sus pesajes desde
   * el dashboard, así que la línea base convive con el resto de la serie y
   * comparar contra el punto de partida no obliga a leer dos sitios.
   *
   * Solo se envían los campos que el alta capturó de verdad: `bodyAge`, por
   * ejemplo, no se pregunta en el alta y rellenarlo con 0 sería un dato
   * inventado. Devuelve el id del doc creado, o `null` si no hay nada que
   * guardar.
   */
  private async saveBaseline(
    uid: string,
    profile: Omit<PatientProfile, 'uid'>
  ): Promise<string | null> {
    const weight = profile.initialWeight ?? null;
    const payload: Record<string, unknown> = { uID: uid, date: Timestamp.now() };

    if (weight) payload['weight'] = weight;

    // El IMC se deriva en vez de preguntarlo: el alta sí tiene la talla, y
    // así no depende de que alguien lo calcule a mano.
    const bmi = calculateImc(weight ?? undefined, profile.initialHeight);
    if (bmi) payload['bmi'] = bmi;

    const bc = profile.bodyComposition;
    if (bc?.fatPercentage != null) payload['fatMassPercentage'] = bc.fatPercentage;
    if (bc?.muscleMassPercentage != null) payload['muscleMassPercentage'] = bc.muscleMassPercentage;
    if (bc?.visceralFat != null) payload['visceralFat'] = bc.visceralFat;

    // Sin peso ni porcentajes no hay medición que registrar.
    if (Object.keys(payload).length <= 2) return null;

    const ref = await addDoc(collection(this.firestore, 'body_composition'), payload);
    return ref.id;
  }

  async createPatient(profile: Omit<PatientProfile, 'uid'>): Promise<Resource<CreatePatientResult>> {
    if (!this.connectivity.online()) {
      return resource.error('Sin conexión: guarda el borrador y se creará al volver la señal.');
    }

    let response: CreatePatientResult;

    // 1) La cuenta la crea el backend: genera el password temporal, asigna
    //    el claim y manda el correo.
    try {
      const token = await this.auth.currentUser?.getIdToken();
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });

      response = await firstValueFrom(
        this.http.post<CreatePatientResult>(
          `${this.apiUrl}/player-creation`,
          {
            displayName: profile.displayName,
            email: profile.email,
            edad: profile.age ?? 18,
          },
          { headers }
        )
      );
    } catch (error: any) {
      return resource.error(
        error.error?.error || error.message || 'No se pudo registrar el paciente',
        undefined,
        error
      );
    }

    // 2) La medición inicial va a la serie `body_composition`, que es donde
    //    el paciente después registra sus pesajes. Si falla, el alta sigue
    //    en pie pero queda sin línea base, así que se reporta aparte en vez
    //    de tumbar todo.
    let baselineId: string | undefined;
    try {
      baselineId = (await this.saveBaseline(response.uid, profile)) ?? undefined;
      // `undefined` aquí significa "no había medición que guardar", que no
      // es un error: el peso y los porcentajes son opcionales. Solo se
      // marca false si se intentó y no se pudo.
      response.baselineSaved = baselineId !== undefined ? true : undefined;
    } catch (error) {
      console.error('[PatientsRepo] No se pudo escribir la línea base', error);
      response.baselineSaved = false;
    }

    // 3) Encima va el expediente clínico. Si esto falla, la cuenta YA EXISTE
    //    y el correo YA SALIÓ: repetir el alta devolvería "email already
    //    exists", así que se marca como pendiente en vez de reportar un
    //    error genérico que invite a reintentar la creación completa.
    try {
      await setDoc(
        doc(this.firestore, 'players', response.uid),
        toPlain({
          ...profile,
          // El peso y los porcentajes ya quedaron en `body_composition`;
          // no se duplican en el perfil. `toPlain` omite las claves con
          // undefined, así que Firestore nunca las ve.
          initialWeight: undefined,
          bodyComposition: undefined,
          baselineId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
        { merge: true }
      );
      response.profileSaved = true;
      this.connectivity.lastSyncedAt.set(Date.now());
    } catch (error) {
      console.error('[PatientsRepo] Cuenta creada pero el expediente no se guardó', error);
      response.profileSaved = false;
    }

    return resource.success(response);
  }

  // ---------------------------------------------------------------------
  // Borradores offline
  // ---------------------------------------------------------------------

  /** Guarda el alta como borrador local. Devuelve el id del borrador. */
  async saveDraft(profile: Omit<PatientProfile, 'uid'>): Promise<string> {
    const now = Date.now();
    const id = `draft_${now}_${Math.random().toString(36).slice(2, 8)}`;

    const draft: PatientDraft = {
      id,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      profile,
    };

    await this.idb.db.patient_drafts.put(draft);
    await this.loadDrafts();
    return id;
  }

  async deleteDraft(id: string): Promise<void> {
    await this.idb.db.patient_drafts.delete(id);
    await this.loadDrafts();
  }

  private async loadDrafts(): Promise<void> {
    try {
      const drafts = await this.readAllFromStore<PatientDraft>('patient_drafts');
      this._drafts.set([...(drafts ?? [])].sort((a, b) => b.createdAt - a.createdAt));
      this.connectivity.pendingCount.set(
        this._drafts().filter((draft) => draft.status !== 'done').length
      );
    } catch (error) {
      console.warn('[PatientsRepo] No se pudieron leer los borradores', error);
    }
  }

  /**
   * Intenta crear todos los borradores pendientes. Al volver la señal los
   * pacientes se dan de alta solos, en el orden en que se capturaron.
   */
  async flushDrafts(): Promise<{ created: number; failed: number }> {
    const pending = this._drafts().filter((draft) => draft.status === 'pending' || draft.status === 'failed');
    if (!pending.length) return { created: 0, failed: 0 };

    this.connectivity.syncing.set(true);
    let created = 0;
    let failed = 0;

    for (const draft of pending) {
      await this.idb.db.patient_drafts.put({ ...draft, status: 'creating', error: undefined });
      await this.loadDrafts();

      const result = await this.createPatient(draft.profile);

      if (result.status === 'success') {
        created++;
        await this.idb.db.patient_drafts.delete(draft.id);
      } else {
        failed++;
        await this.idb.db.patient_drafts.put({
          ...draft,
          status: 'failed',
          error: result.status === 'error' ? result.message : 'Error desconocido',
        });
      }

      await this.loadDrafts();
    }

    this.connectivity.syncing.set(false);
    this.connectivity.lastSyncedAt.set(Date.now());
    return { created, failed };
  }

  /** Suscripción reactiva a `players` como Observable (uso puntual). */
  watchPatients(): Observable<PatientProfile[]> {
    return new Observable<PatientProfile[]>((subscriber) => {
      this.start();
      const ref = effect(() => {
        subscriber.next(this._patients());
      });
      return () => ref.destroy();
    });
  }
}
