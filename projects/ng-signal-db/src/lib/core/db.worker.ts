import { MainThreadEngine } from './main-thread-engine';
import { WorkerInbound, WorkerOutbound } from './worker-protocol';

let engine: MainThreadEngine | null = null;

function extractTransferables(obj: any): Transferable[] {
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

self.onmessage = async (e: MessageEvent<WorkerInbound>) => {
  const msg = e.data;

  try {
    switch (msg.type) {
      case 'INIT':
        engine = new MainThreadEngine(msg.config);
        await engine.open();
        self.postMessage({ type: 'READY' } as WorkerOutbound);
        break;

      case 'GET':
        if (!engine) throw new Error('Engine not initialized');
        const result = await engine.get(msg.store, msg.key);
        self.postMessage({ type: 'RESULT', id: msg.id, result } as WorkerOutbound, extractTransferables(result));
        break;

      case 'GET_ALL':
        if (!engine) throw new Error('Engine not initialized');
        const results = await engine.getAll(msg.store, msg.query, msg.indexName, msg.limit, msg.offset);
        self.postMessage({ type: 'RESULT', id: msg.id, result: results } as WorkerOutbound, extractTransferables(results));
        break;

      case 'PUT':
        if (!engine) throw new Error('Engine not initialized');
        const putId = await engine.put(msg.store, msg.value);
        self.postMessage({ type: 'RESULT', id: msg.id, result: putId } as WorkerOutbound);
        break;

      case 'DELETE':
        if (!engine) throw new Error('Engine not initialized');
        await engine.delete(msg.store, msg.key);
        self.postMessage({ type: 'RESULT', id: msg.id } as WorkerOutbound);
        break;

      case 'BATCH':
        if (!engine) throw new Error('Engine not initialized');
        const batchResults = await engine.batch(msg.stores, msg.mode, msg.operations);
        self.postMessage({ type: 'BATCH_RESULT', id: msg.id, results: batchResults } as WorkerOutbound);
        break;

      case 'DRAIN':
        self.postMessage({ type: 'DRAINED', id: msg.id } as WorkerOutbound);
        break;
    }
  } catch (err: any) {
    const isTransient = err.name === 'QuotaExceededError' || err.name === 'UnknownError' || err.name === 'TimeoutError';
    self.postMessage({
      type: 'ERROR',
      id: (msg as any).id,
      error: err.message,
      retryable: isTransient,
    } as WorkerOutbound);
  }
};