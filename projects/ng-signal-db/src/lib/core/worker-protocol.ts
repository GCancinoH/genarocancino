import { NgSignalDBConfig } from '../core/types';

export interface TransactionOperation {
  type: 'GET' | 'PUT' | 'DELETE';
  store: string;
  key?: IDBValidKey;
  value?: any;
}

export type WorkerInbound =
  | { type: 'INIT'; config: NgSignalDBConfig }
  | { type: 'GET'; id: string; store: string; key: IDBValidKey }
  | { type: 'GET_ALL'; id: string; store: string; query?: IDBKeyRange; indexName?: string; limit?: number; offset?: number }
  | { type: 'PUT'; id: string; store: string; value: unknown }
  | { type: 'DELETE'; id: string; store: string; key: IDBValidKey }
  | { type: 'BATCH'; id: string; stores: string[]; mode: IDBTransactionMode; operations: TransactionOperation[] }
  | { type: 'DRAIN'; id: string };

export type WorkerOutbound =
  | { type: 'READY' }
  | { type: 'RESULT'; id: string; result: unknown }
  | { type: 'BATCH_RESULT'; id: string; results: unknown[] }
  | { type: 'ERROR'; id: string; error: string; retryable: boolean }
  | { type: 'VERSION_BUMP'; store: string; newVersion: number }
  | { type: 'DRAINED'; id: string };
