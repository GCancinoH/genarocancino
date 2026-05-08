export type Resource<T> = Success<T> | Error<T> | Loading<T>;

export interface Success<T> {
  readonly status: 'success';
  readonly data?: T;
  readonly message?: string;
}

export interface Error<T> {
  readonly status: 'error';
  readonly message: string;
  readonly data?: T;
  readonly exception?: any;
}

export interface Loading<T> {
  readonly status: 'loading';
  readonly data?: T;
}

/**
 * Helper functions to create Resource states
 */
export const resource = {
  success: <T>(data?: T, message?: string): Success<T> => ({
    status: 'success',
    data,
    message
  }),

  error: <T>(message: string, data?: T, exception?: any): Error<T> => ({
    status: 'error',
    message,
    data,
    exception
  }),

  loading: <T>(data?: T): Loading<T> => ({
    status: 'loading',
    data
  })
};
