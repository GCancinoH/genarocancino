import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

/**
 * Estado de conexión y de la cola de sincronización.
 *
 * `online` refleja el evento online/offline del navegador (rápido, pero
 * no siempre preciso: puede decir "online" sin salida real a internet). Por eso el
 * repositorio también usa el estado real de Firestore para marcar si una
 * escritura sigue pendiente.
 *
 * `pendingCount` cuenta las escrituras hechas offline que Firestore aún no
 * ha confirmado. Se recalcula con los borradores y los cambios encolados.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly destroyRef = inject(DestroyRef);

  /** true/false según navigator.onLine, actualizado con los eventos. */
  readonly online = signal<boolean>(typeof navigator === 'undefined' ? true : navigator.onLine);

  /** true mientras hay operaciones esperando confirmación del servidor. */
  readonly syncing = signal<boolean>(false);

  /** Última sincronización exitosa (epoch ms). */
  readonly lastSyncedAt = signal<number | null>(null);

  /** Operaciones pendientes de confirmar. */
  readonly pendingCount = signal<number>(0);

  /** true si todo está descargado y no hay nada en cola. */
  readonly inSync = computed(() => this.online() && !this.syncing() && this.pendingCount() === 0);

  readonly statusLabel = computed(() => {
    if (!this.online()) return 'SIN CONEXIÓN';
    if (this.syncing()) return 'SINCRONIZANDO...';
    if (this.pendingCount() > 0) return `${this.pendingCount()} PENDIENTE(S)`;
    return 'EN LÍNEA';
  });

  constructor() {
    if (typeof window !== 'undefined') {
      const setOnline = () => this.online.set(true);
      const setOffline = () => this.online.set(false);

      window.addEventListener('online', setOnline);
      window.addEventListener('offline', setOffline);

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('online', setOnline);
        window.removeEventListener('offline', setOffline);
      });
    }
  }
}
