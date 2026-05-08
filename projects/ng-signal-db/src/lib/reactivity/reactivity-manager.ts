import { signal, WritableSignal } from '@angular/core';
import { NgSignalDBStatus, OptimisticUpdate, OptimisticOperation } from './types';

export class ReactivityManager {
  private storeVersions = new Map<string, WritableSignal<number>>();
  private optimisticCache = new Map<string, Map<any, OptimisticUpdate<any>>>(); // store -> id -> update
  private broadcast: BroadcastChannel | null;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  
  public dbStatus = signal<NgSignalDBStatus>('initializing');

  constructor(dbName: string) {
    this.broadcast = new BroadcastChannel(`ng-signal-db-${dbName}`);
    this.broadcast.onmessage = (e) => {
      if (e.data.type === 'VERSION_BUMP') {
        this.incrementVersion(e.data.store, false);
      }
    };
  }

  getStoreVersion(storeName: string): WritableSignal<number> {
    if (!this.storeVersions.has(storeName)) {
      this.storeVersions.set(storeName, signal(0));
    }
    return this.storeVersions.get(storeName)!;
  }

  incrementVersion(storeName: string, broadcast = true) {
    if (this.debounceTimers.has(storeName)) {
      clearTimeout(this.debounceTimers.get(storeName));
    }
    this.debounceTimers.set(storeName, setTimeout(() => {
      const version = this.getStoreVersion(storeName);
      version.update(v => v + 1);
      if (broadcast && this.broadcast) {
        this.broadcast.postMessage({ type: 'VERSION_BUMP', store: storeName });
      }
      this.debounceTimers.delete(storeName);
    }, 0));
  }

  setOptimistic(storeName: string, id: any, data: any, type: OptimisticOperation = 'put') {
    if (!this.optimisticCache.has(storeName)) {
      this.optimisticCache.set(storeName, new Map());
    }
    this.optimisticCache.get(storeName)!.set(id, { type, id, data });
    this.incrementVersion(storeName, false); // Local only for optimistic
  }

  clearOptimistic(storeName: string, id: any, shouldBroadcast = true) {
    this.optimisticCache.get(storeName)?.delete(id);
    // Broadcast on actual success or on rollback to trigger re-fetch
    this.incrementVersion(storeName, shouldBroadcast); 
  }

  getOptimisticUpdates(storeName: string): Map<any, OptimisticUpdate<any>> {
    return this.optimisticCache.get(storeName) || new Map();
  }

  destroy() {
    if (this.broadcast) {
      this.broadcast.close();
      this.broadcast = null;
    }
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}
