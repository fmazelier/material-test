import { computed, signal, Signal } from '@angular/core';
import { catchError, defer, finalize, Observable, throwError } from 'rxjs';

export type StoreError = {
  message: string;
  code?: string | number;
};

export abstract class BaseStore<TState extends object> {
  private readonly _state: ReturnType<typeof signal<TState>>;
  private readonly _loading = signal(false);
  private readonly _error = signal<StoreError | null>(null);

  readonly state: Signal<TState>;
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  constructor(initialState: TState) {
    this._state = signal(initialState);
    this.state = this._state.asReadonly();
  }

  protected select<R>(selector: (state: TState) => R): Signal<R> {
    return computed(() => selector(this.state()));
  }

  protected patch(partial: Partial<TState>): void {
    this._state.update((current) => ({ ...current, ...partial }));
  }

  protected set(state: TState): void {
    this._state.set(state);
  }

  protected setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  protected setError(error: StoreError | null): void {
    this._error.set(error);
  }

  protected extractError(err: unknown): StoreError {
    const httpError = err as { message?: string; status?: number };
    return {
      message: httpError.message ?? 'An error occurred',
      code: httpError.status,
    };
  }

  protected withLoading<T>(source$: Observable<T>): Observable<T> {
    return defer(() => {
      this._loading.set(true);
      this._error.set(null);

      return source$.pipe(
        catchError((err: unknown) => {
          this._error.set(this.extractError(err));
          return throwError(() => err);
        }),
        finalize(() => this._loading.set(false))
      );
    });
  }
}
