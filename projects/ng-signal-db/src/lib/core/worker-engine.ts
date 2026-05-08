import { IdbEngine, NgSignalDBConfig } from './types';
import { WorkerInbound, WorkerOutbound } from './worker-protocol';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export class WorkerEngine implements IdbEngine {
  private worker: Worker;
  private pendingRequests = new Map<string, { 
    resolve: Function; 
    reject: Function; 
    retries: number;
    originalMsg: any;
  }>();
  private defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 5000
  };
  private retryOptions: RetryOptions;
  private config: NgSignalDBConfig;

  constructor(config: NgSignalDBConfig, retryOptions?: RetryOptions) {
    this.config = config;
    this.retryOptions = { ...this.defaultRetryOptions, ...retryOptions };
    this.worker = new Worker(new URL('./db.worker.ts', import.meta.url), {
      type: 'module'
    });
    this.worker.onmessage = (e: MessageEvent<WorkerOutbound>) => this.handleMessage(e.data);
  }

  async open(): Promise<void> {
    const configToWorker = { ...this.config, plugins: undefined };
    return this.sendRequest({ type: 'INIT', config: configToWorker });
  }

  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    return this.sendRequest({ type: 'GET', id: crypto.randomUUID(), store: storeName, key });
  }

  async getAll<T>(storeName: string, query?: IDBKeyRange, indexName?: string): Promise<T[]> {
    return this.sendRequest({ type: 'GET_ALL', id: crypto.randomUUID(), store: storeName, query, indexName });
  }

  async put<T>(storeName: string, value: T): Promise<IDBValidKey> {
    return this.sendRequest({ type: 'PUT', id: crypto.randomUUID(), store: storeName, value });
  }

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    return this.sendRequest({ type: 'DELETE', id: crypto.randomUUID(), store: storeName, key });
  }

  async batch<T>(stores: string[], mode: IDBTransactionMode, operations: Array<{ type: 'get' | 'put' | 'delete'; store: string; key?: IDBValidKey; value?: any }>): Promise<T[]> {
    return this.sendRequest({ type: 'BATCH', id: crypto.randomUUID(), stores, mode, operations: operations as any });
  }

  async transaction<T>(stores: string | string[], mode: IDBTransactionMode, callback: (tx: IDBTransaction) => Promise<T>): Promise<T> {
    throw new Error('NgSignalDB: Transactions with callbacks are only supported on the Main Thread Engine.');
  }

  async close(): Promise<void> {
    try {
      await Promise.race([
        this.sendRequest({ type: 'DRAIN', id: crypto.randomUUID() }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Drain timeout')), 1000))
      ]);
    } catch (e) {
      console.warn('[NgSignalDB] Worker drain failed or timed out:', e);
    } finally {
      this.worker.terminate();
    }
  }

  private sendRequest<T>(msg: WorkerInbound): Promise<T> {
    const id = (msg as any).id || 'init';
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, retries: 0, originalMsg: msg });
      const transferables: Transferable[] = [];
      if (msg.type === 'PUT') {
        transferables.push(...this.extractTransferables(msg.value));
      } else if (msg.type === 'BATCH') {
        msg.operations.forEach(op => {
          if (op.type === 'PUT') transferables.push(...this.extractTransferables(op.value));
        });
      }
      this.worker.postMessage(msg, transferables);
    });
  }

  private extractTransferables(obj: any): Transferable[] {
    const transferables: Transferable[] = [];
    if (!obj) return transferables;
    if (obj instanceof ArrayBuffer) transferables.push(obj);
    else if (ArrayBuffer.isView(obj)) transferables.push(obj.buffer);
    else if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        if (obj[key] instanceof ArrayBuffer) transferables.push(obj[key]);
        else if (ArrayBuffer.isView(obj[key])) transferables.push(obj[key].buffer);
      }
    }
    return transferables;
  }

  private handleMessage(msg: WorkerOutbound) {
    if (msg.type === 'READY') {
      const pending = this.pendingRequests.get('init');
      if (pending) {
        pending.resolve();
        this.pendingRequests.delete('init');
      }
      return;
    }

    if (msg.type === 'DRAINED') {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        pending.resolve();
        this.pendingRequests.delete(msg.id);
      }
      return;
    }

    if (msg.type === 'RESULT' || msg.type === 'ERROR') {
      const pending = this.pendingRequests.get(msg.id);
      if (!pending) return;

      if (msg.type === 'RESULT') {
        pending.resolve(msg.result);
        this.pendingRequests.delete(msg.id);
        return;
      }

      // Handle ERROR
      if (msg.retryable) {
        const maxRetries = this.retryOptions.maxRetries!;
        const baseDelay = this.retryOptions.baseDelay!;
        const maxDelay = this.retryOptions.maxDelay!;

        if (pending.retries < maxRetries) {
          pending.retries++;
          const delay = Math.min(baseDelay * Math.pow(2, pending.retries - 1), maxDelay);
          
          setTimeout(() => {
            this.worker.postMessage(pending.originalMsg);
          }, delay);
          return;
        }
      }

      pending.reject(new Error(msg.error));
      this.pendingRequests.delete(msg.id);
    }
  }
}