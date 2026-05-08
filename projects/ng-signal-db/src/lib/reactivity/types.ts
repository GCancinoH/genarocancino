export type NgSignalDBStatus = 'initializing' | 'ready' | 'blocked' | 'error' | 'closed';

export type ResourceStatus = 'loading' | 'success' | 'error' | 'refreshing';

export interface NgSignalDBResourceState<T> {
  status: ResourceStatus;
  data: T | undefined;
  error?: any;
}

export type WriteStatus = 'pending' | 'in_flight' | 'success' | 'failed';

export type OptimisticOperation = 'put' | 'delete';

export interface OptimisticUpdate<T> {
  type: OptimisticOperation;
  id: any;
  data?: T;
}

export interface WriteState<T> {
  status: WriteStatus;
  operation: OptimisticOperation;
  data?: T;
  error?: any;
}
