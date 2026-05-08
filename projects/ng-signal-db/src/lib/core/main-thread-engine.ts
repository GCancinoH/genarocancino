import { IdbEngine, NgSignalDBConfig } from './types';

export class MainThreadEngine implements IdbEngine {
  private db: IDBDatabase | null = null;

  constructor(private config: NgSignalDBConfig) {}

  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion || this.config.version;
        const transaction = request.transaction!;

        // 1. Ensure stores exist
        for (const [storeName, storeConfig] of Object.entries(this.config.stores)) {
          let store: IDBObjectStore;
          if (!db.objectStoreNames.contains(storeName)) {
            store = db.createObjectStore(storeName, {
              keyPath: storeConfig.keyPath,
              autoIncrement: storeConfig.autoIncrement,
            });
          } else {
            store = transaction.objectStore(storeName);
          }

          // 2. Ensure indexes exist
          if (storeConfig.indexes) {
            for (const idx of storeConfig.indexes) {
              if (!store.indexNames.contains(idx.name)) {
                store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
              }
            }
          }
        }

        // 3. Run migrations
        if (this.config.migrations) {
          const pending = this.config.migrations
            .filter((m) => m.version > oldVersion && m.version <= newVersion)
            .sort((a, b) => a.version - b.version);

          for (const migration of pending) {
            migration.up(db, transaction);
          }
        }
      };

      request.onsuccess = async () => {
        this.db = request.result;
        
        if (this.config.plugins) {
          for (const plugin of this.config.plugins) {
            if (plugin.onInit) await plugin.onInit(this.db);
          }
        }
        
        resolve();
      };

      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        console.warn('NgSignalDB: Database is blocked by another tab.');
      };
    });
  }

  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    const store = this.getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string, query?: IDBKeyRange, indexName?: string, limit?: number, offset?: number): Promise<T[]> {
    const store = this.getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const target = indexName ? store.index(indexName) : store;
      
      if (limit === undefined && offset === undefined) {
        const request = target.getAll(query);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const results: T[] = [];
        let cursorOffset = offset || 0;
        let advanced = false;
        
        const request = target.openCursor(query);
        request.onsuccess = (event: any) => {
          const cursor = event.target.result;
          if (!cursor) {
            resolve(results);
            return;
          }
          
          if (!advanced && cursorOffset > 0) {
            advanced = true;
            cursor.advance(cursorOffset);
            return;
          }
          
          results.push(cursor.value);
          
          if (limit !== undefined && results.length >= limit) {
            resolve(results);
            return;
          }
          
          cursor.continue();
        };
        request.onerror = () => reject(request.error);
      }
    });
  }

  async put<T>(storeName: string, value: T): Promise<IDBValidKey> {
    const store = this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const store = this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  async transaction<T>(stores: string | string[], mode: IDBTransactionMode, callback: (tx: IDBTransaction) => Promise<T>): Promise<T> {
    if (!this.db) throw new Error('NgSignalDB: Database not opened.');
    const storeArray = Array.isArray(stores) ? stores : [stores];
    const tx = this.db.transaction(storeArray, mode);
    return callback(tx);
  }

  async batch<T>(stores: string[], mode: IDBTransactionMode, operations: Array<{ type: 'get' | 'put' | 'delete'; store: string; key?: IDBValidKey; value?: any }>): Promise<T[]> {
    if (!this.db) throw new Error('NgSignalDB: Database not opened.');
    
    const tx = this.db.transaction(stores, mode);
    const results: T[] = [];
    
    for (const op of operations) {
      const store = tx.objectStore(op.store);
      let result: any;
      
      switch (op.type) {
        case 'get':
          result = await new Promise<IDBValidKey>((res, rej) => {
            const req = store.get(op.key as IDBValidKey);
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
          });
          break;
        case 'put':
          result = await new Promise<IDBValidKey>((res, rej) => {
            const req = store.put(op.value);
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
          });
          break;
        case 'delete':
          result = await new Promise<void>((res, rej) => {
            const req = store.delete(op.key as IDBValidKey);
            req.onsuccess = () => res();
            req.onerror = () => rej(req.error);
          });
          break;
      }
      results.push(result);
    }
    
    return results;
  }

  private getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) throw new Error('NgSignalDB: Database not opened.');
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }
}
