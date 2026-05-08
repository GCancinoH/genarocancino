export interface IndexConfig {
  name: string;
  keyPath: string | string[];
  unique?: boolean;
}

export interface StoreConfig {
  keyPath: string | string[];
  autoIncrement?: boolean;
  indexes?: IndexConfig[];
}

export interface Migration {
  version: number;
  up: (db: IDBDatabase, transaction: IDBTransaction) => void;
}

export interface NgSignalDBPlugin {
  onBeforeWrite?(storeName: string, data: any): Promise<any> | any;
  onAfterRead?(storeName: string, data: any): Promise<any> | any;
  onInit?(db: IDBDatabase): Promise<void> | void;
}

export interface NgSignalDBConfig {
  dbName: string;
  version: number;
  stores: Record<string, StoreConfig>;
  migrations?: Migration[];
  plugins?: NgSignalDBPlugin[];
}

export interface IdbEngine {
  open(): Promise<void>;
  get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined>;
  getAll<T>(storeName: string, query?: IDBKeyRange, indexName?: string, limit?: number, offset?: number): Promise<T[]>;
  put<T>(storeName: string, value: T): Promise<IDBValidKey>;
  delete(storeName: string, key: IDBValidKey): Promise<void>;
  close(): void;
  transaction<T>(stores: string | string[], mode: IDBTransactionMode, callback: (tx: IDBTransaction) => Promise<T>): Promise<T>;
  batch<T>(stores: string[], mode: IDBTransactionMode, operations: Array<{ type: 'get' | 'put' | 'delete'; store: string; key?: IDBValidKey; value?: any }>): Promise<T[]>;
}
