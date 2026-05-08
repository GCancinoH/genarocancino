import { Injectable, resource, computed, Signal, inject, NgZone, PLATFORM_ID, DestroyRef, Injector, runInInjectionContext, signal, Optional } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgSignalDBConfig, IdbEngine, StoreConfig } from '../core/types';
import { ReactivityManager } from '../reactivity/reactivity-manager';
import { NgSignalDBResourceState, ResourceStatus, NgSignalDBStatus } from '../reactivity/types';
import { NG_SIGNAL_DB_CONFIG, NG_SIGNAL_DB_PLUGINS } from '../tokens';
import { IDB_ENGINE_FACTORY } from '../engine-factory';
import { createSsrNoopDb } from './ssr-noop';
import { MainThreadEngine } from '../core/main-thread-engine';

/** @internal */
export class QueryBuilder<T> {
  private queryKey: string | null = null;
  private queryRange: IDBKeyRange | null = null;
  private isIndexQuery = false;
  private _limit?: number;
  private _offset?: number;

  constructor(
    private storeName: string,
    private service: NgSignalDBService,
    private config: NgSignalDBConfig,
    private injector: Injector,
    private storeConfig?: StoreConfig
  ) {}

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  offset(n: number): this {
    this._offset = n;
    return this;
  }

  where(key: string): this {
    const isPk = this.storeConfig?.keyPath === key;
    const hasIndex = this.storeConfig?.indexes?.some(idx => idx.keyPath === key || (Array.isArray(idx.keyPath) && idx.keyPath.includes(key)));
    
    if (!isPk && !hasIndex) {
      console.warn(`[NgSignalDB] No index found for "${key}" in store "${this.storeName}". This query will perform a full table scan.`);
    }

    this.queryKey = key;
    this.isIndexQuery = !isPk;
    return this;
  }

  equals(value: any): this {
    this.queryRange = IDBKeyRange.only(value);
    return this;
  }

  above(value: any, open = false): this {
    this.queryRange = IDBKeyRange.lowerBound(value, open);
    return this;
  }

  below(value: any, open = false): this {
    this.queryRange = IDBKeyRange.upperBound(value, open);
    return this;
  }

  between(lower: any, upper: any, lowerOpen = false, upperOpen = false): this {
    this.queryRange = IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen);
    return this;
  }

  asSignal(): Signal<NgSignalDBResourceState<T[]>> {
    return runInInjectionContext(this.injector, () => {
      const version = this.service.reactivity.getStoreVersion(this.storeName);
      const queryRange = this.queryRange;
      const indexName = this.isIndexQuery ? this.getIndexName(this.queryKey!) : undefined;

      const dbResource = resource({
        loader: async () => {
          version(); // Track dependency
          await this.service.initializedPromise;
          return await this.service.activeEngine.getAll<T>(this.storeName, queryRange || undefined, indexName, this._limit, this._offset);
        }
      });

      return computed(() => {
        if (this.service.status() === 'initializing') {
          return { status: 'loading', data: [] };
        }

        const resStatus = dbResource.status() as any;
        const data = dbResource.value() || [];
        const error = dbResource.error();

        let status: ResourceStatus = 'success';
        if (resStatus === 'loading' || resStatus === 'reloading') status = 'loading';
        if (resStatus === 'error') status = 'error';

        const optimistic = this.service.reactivity.getOptimisticUpdates(this.storeName);
        if (optimistic.size === 0) return { status, data, error };

        const merged = [...data];
        const keyPath = this.storeConfig?.keyPath || 'id';

        optimistic.forEach((update) => {
          if (this.queryRange && update.type === 'put' && update.data && !this.matchesQuery(update.data)) {
            return;
          }

          const idx = merged.findIndex((m: any) => {
            if (typeof keyPath === 'string') return m[keyPath] === update.id;
            if (Array.isArray(keyPath)) return JSON.stringify(keyPath.map(k => m[k])) === JSON.stringify(update.id);
            return m.id === update.id;
          });

          if (update.type === 'put') {
            if (idx !== -1) merged[idx] = update.data;
            else merged.push(update.data);
          } else if (update.type === 'delete') {
            if (idx !== -1) merged.splice(idx, 1);
          }
        });

        return { status, data: merged, error };
      });
    });
  }

  get(keyOrFn: IDBValidKey | (() => IDBValidKey | undefined)): Signal<NgSignalDBResourceState<T | undefined>> {
    return runInInjectionContext(this.injector, () => {
      const version = this.service.reactivity.getStoreVersion(this.storeName);
      const keySignal = typeof keyOrFn === 'function' ? computed(keyOrFn) : () => keyOrFn;
      
      const dbResource = resource({
        loader: async () => {
          const key = keySignal();
          const v = version(); // Track dependency
          if (key === undefined || key === null) return undefined;
          
          await this.service.initializedPromise;
          const rawData = await this.service.activeEngine.get<T>(this.storeName, key);
          
          let processedData = rawData;
          if (processedData && this.config.plugins) {
            for (const plugin of this.config.plugins) {
              if (plugin.onAfterRead) processedData = await plugin.onAfterRead(this.storeName, processedData);
            }
          }
          return processedData;
        }
      });

      return computed(() => {
        if (this.service.status() === 'initializing') {
          return { status: 'loading', data: undefined };
        }

        const resStatus = dbResource.status() as any;
        const data = dbResource.value();
        const error = dbResource.error();
        const key = keySignal();

        let status: ResourceStatus = 'success';
        if (resStatus === 'loading' || resStatus === 'reloading') status = 'loading';
        if (resStatus === 'error') status = 'error';

        if (key !== undefined && key !== null) {
          const optimistic = this.service.reactivity.getOptimisticUpdates(this.storeName);
          const update = optimistic.get(key);
          
          if (update) {
            if (update.type === 'put') return { status, data: update.data, error };
            if (update.type === 'delete') return { status, data: undefined, error };
          }
        }

        return { status, data, error };
      });
    });
  }

  async getOne(key: IDBValidKey): Promise<T | undefined> {
    await this.service.initializedPromise;
    const rawData = await this.service.activeEngine.get<T>(this.storeName, key);
    
    let processedData = rawData;
    if (processedData && this.config.plugins) {
      for (const plugin of this.config.plugins) {
        if (plugin.onAfterRead) processedData = await plugin.onAfterRead(this.storeName, processedData);
      }
    }
    return processedData;
  }

  private getIndexName(key: string): string | undefined {
    return this.storeConfig?.indexes?.find(idx => idx.keyPath === key || (Array.isArray(idx.keyPath) && idx.keyPath.includes(key)))?.name;
  }

  private matchesQuery(item: T): boolean {
    if (!this.queryKey || !this.queryRange) return true;
    const val = (item as any)[this.queryKey];
    return this.queryRange.includes(val);
  }

  async add(item: T): Promise<void> {
    return this.put(item);
  }

  async put(item: T): Promise<void> {
    const id = this.getItemId(item);
    try {
      await this.service.initializedPromise;
      
      let processedItem = item;
      if (this.config.plugins) {
        for (const plugin of this.config.plugins) {
          if (plugin.onBeforeWrite) processedItem = await plugin.onBeforeWrite(this.storeName, processedItem);
        }
      }

      this.service.reactivity.setOptimistic(this.storeName, id, item, 'put');
      await this.service.activeEngine.put(this.storeName, processedItem);
      this.service.reactivity.clearOptimistic(this.storeName, id);
    } catch (error) {
      console.error(`[NgSignalDB] Failed to put item in store "${this.storeName}":`, error);
      this.service.reactivity.clearOptimistic(this.storeName, id);
      throw error;
    }
  }

  async delete(key: IDBValidKey): Promise<void> {
    try {
      await this.service.initializedPromise;
      this.service.reactivity.setOptimistic(this.storeName, key, null, 'delete');
      await this.service.activeEngine.delete(this.storeName, key);
      this.service.reactivity.clearOptimistic(this.storeName, key);
    } catch (error) {
      console.error(`[NgSignalDB] Failed to delete item from store "${this.storeName}":`, error);
      this.service.reactivity.clearOptimistic(this.storeName, key);
      throw error;
    }
  }

  private getItemId(item: any): any {
    const keyPath = this.storeConfig?.keyPath;
    if (typeof keyPath === 'string') return item[keyPath];
    if (Array.isArray(keyPath)) return keyPath.map(k => item[k]);
    return item.id;
  }
}

@Injectable()
export class NgSignalDBService {
  private engine!: IdbEngine;
  private _reactivity: ReactivityManager;
  private proxy: any;
  private zone = inject(NgZone, { optional: true });
  private platformId = inject(PLATFORM_ID);
  private config = inject(NG_SIGNAL_DB_CONFIG);
  private injectedPlugins = inject(NG_SIGNAL_DB_PLUGINS, { optional: true });
  private destroyRef = inject(DestroyRef);
  private engineFactory = inject(IDB_ENGINE_FACTORY);
  private injector = inject(Injector);
  private initPromise: Promise<void>;
  private resolveInit!: () => void;
  private rejectInit!: (err: any) => void;

  private initialized = false;

  constructor() {
    this._reactivity = new ReactivityManager(this.config.dbName);
    this.initPromise = new Promise<void>((resolve, reject) => {
      this.resolveInit = resolve;
      this.rejectInit = reject;
    });

    if (this.injectedPlugins && this.injectedPlugins.length > 0) {
      this.config.plugins = [...(this.config.plugins || []), ...this.injectedPlugins];
    }
  }

  get activeEngine(): IdbEngine { return this.engine; }
  get reactivity(): ReactivityManager { return this._reactivity; }
  get initializedPromise(): Promise<void> { return this.initPromise; }

  private ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;

    if (!isPlatformBrowser(this.platformId)) {
      this.proxy = createSsrNoopDb();
      this.resolveInit();
      return;
    }

    console.log(`[NgSignalDB] Initializing database "${this.config.dbName}"...`);

    const tryInitialize = (isFallback = false) => {
      try {
        this.engine = isFallback ? new MainThreadEngine(this.config) : this.engineFactory(this.config);

        const startInit = () => this.engine.open()
          .then(() => {
            this.reactivity.dbStatus.set('ready');
            console.log(`[NgSignalDB] Database "${this.config.dbName}" ready (${isFallback ? 'Main Thread' : 'Worker'})`);
            this.resolveInit();
          })
          .catch(err => {
            if (!isFallback) {
              console.warn('[NgSignalDB] Worker failed, falling back to Main Thread:', err);
              tryInitialize(true);
            } else {
              this.reactivity.dbStatus.set('error');
              console.error('[NgSignalDB] Critical initialization failure:', err);
              this.rejectInit(err);
            }
          });

        if (this.zone) {
          this.zone.runOutsideAngular(startInit);
        } else {
          // Zoneless mode: run directly in microtask
          queueMicrotask(() => startInit());
        }
      } catch (err) {
        if (!isFallback) {
          tryInitialize(true);
        } else {
          console.error('[NgSignalDB] Critical initialization failure:', err);
          this.rejectInit(err);
        }
      }
    };

    tryInitialize();
    
    this.proxy = new Proxy(this, {
      get: (target, prop: string) => {
        if (prop in target) return (target as any)[prop];
        const storeConfig = this.config.stores[prop];
        return new QueryBuilder(prop, this, this.config, this.injector, storeConfig);
      }
    });

    this.destroyRef.onDestroy(() => {
      this._reactivity?.dbStatus.set('closed');
      this._reactivity?.destroy();
      this.engine?.close();
    });
  }

  get db(): any {
    this.ensureInitialized();
    return this.proxy;
  }

  get status(): Signal<NgSignalDBStatus> {
    this.ensureInitialized();
    return this.reactivity.dbStatus;
  }

  async transaction<T>(stores: string | string[], mode: IDBTransactionMode, callback: (tx: IDBTransaction) => Promise<T>): Promise<T> {
    await this.initializedPromise;
    if ('transaction' in this.activeEngine) {
      return (this.activeEngine as any).transaction(stores, mode, callback);
    }
    throw new Error('NgSignalDB: Transactions are only supported on the Main Thread Engine.');
  }

  async batch<T>(stores: string[], mode: IDBTransactionMode, operations: Array<{ type: 'get' | 'put' | 'delete'; store: string; key?: IDBValidKey; value?: any }>): Promise<T[]> {
    await this.initializedPromise;
    return this.activeEngine.batch(stores, mode, operations);
  }
}
