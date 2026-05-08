import { signal } from '@angular/core';

export function createSsrNoopDb() {
  const handler: ProxyHandler<any> = {
    get: (target, prop: string) => {
      if (prop === 'asSignal' || prop === 'all') {
        return () => signal({ status: 'success', data: [] });
      }
      if (prop === 'get') {
        return () => signal({ status: 'success', data: undefined });
      }
      if (['add', 'put', 'delete'].includes(prop)) {
        return () => Promise.resolve();
      }
      if (['where', 'equals', 'above', 'below', 'between'].includes(prop)) {
        return () => new Proxy({}, handler);
      }
      // For any other property access on the store or builder
      return new Proxy({}, handler);
    }
  };

  return new Proxy({}, {
    get: (_target, _storeName: string) => {
      return new Proxy({}, handler);
    }
  });
}
