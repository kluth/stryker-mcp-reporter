export type Result<T, E = Error> =
  | { readonly isOk: true; readonly value: T; readonly error?: never }
  | { readonly isOk: false; readonly value?: never; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ isOk: true, value });
export const err = <E>(error: E): Result<never, E> => ({ isOk: false, error });
