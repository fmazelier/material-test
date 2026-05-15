import { Injectable, Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { BaseStore, StoreError } from './base-store';

type TestState = {
  count: number;
  name: string;
};

@Injectable()
class TestStore extends BaseStore<TestState> {
  constructor() {
    super({ count: 0, name: 'initial' });
  }

  getCount(): Signal<number> {
    return this.select((s) => s.count);
  }

  getName(): Signal<string> {
    return this.select((s) => s.name);
  }

  increment(): void {
    this.patch({ count: this.state().count + 1 });
  }

  setName(name: string): void {
    this.patch({ name });
  }

  replace(state: TestState): void {
    this.set(state);
  }

  doWithLoading<T>(source$: Observable<T>): Observable<T> {
    return this.withLoading(source$);
  }

  exposedSetLoading(loading: boolean): void {
    this.setLoading(loading);
  }

  exposedSetError(error: StoreError | null): void {
    this.setError(error);
  }
}

describe('BaseStore', () => {
  let store: TestStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TestStore] });
    store = TestBed.inject(TestStore);
  });

  describe('initial state', () => {
    it('should expose the initial state as a readonly signal', () => {
      expect(store.state()).toEqual({ count: 0, name: 'initial' });
    });

    it('should have loading set to false', () => {
      expect(store.loading()).toBe(false);
    });

    it('should have error set to null', () => {
      expect(store.error()).toBeNull();
    });
  });

  describe('select', () => {
    it('should create a computed signal from state', () => {
      const count = store.getCount();
      expect(count()).toBe(0);

      store.increment();
      expect(count()).toBe(1);
    });

    it('should only recompute when selected slice changes', () => {
      const name = store.getName();
      expect(name()).toBe('initial');

      store.increment();
      expect(name()).toBe('initial');

      store.setName('updated');
      expect(name()).toBe('updated');
    });
  });

  describe('patch', () => {
    it('should partially update state', () => {
      store.setName('patched');
      expect(store.state()).toEqual({ count: 0, name: 'patched' });
    });

    it('should preserve unaffected properties', () => {
      store.increment();
      store.setName('patched');
      expect(store.state()).toEqual({ count: 1, name: 'patched' });
    });
  });

  describe('set', () => {
    it('should fully replace state', () => {
      store.replace({ count: 42, name: 'replaced' });
      expect(store.state()).toEqual({ count: 42, name: 'replaced' });
    });
  });

  describe('setLoading / setError', () => {
    it('should update loading signal', () => {
      store.exposedSetLoading(true);
      expect(store.loading()).toBe(true);

      store.exposedSetLoading(false);
      expect(store.loading()).toBe(false);
    });

    it('should update error signal', () => {
      const error: StoreError = { message: 'fail', code: 500 };
      store.exposedSetError(error);
      expect(store.error()).toEqual(error);

      store.exposedSetError(null);
      expect(store.error()).toBeNull();
    });
  });

  describe('withLoading', () => {
    it('should set loading to true then false on success', () => {
      let loadingDuring: boolean | undefined;

      store.doWithLoading(of('ok')).subscribe(() => {
        loadingDuring = store.loading();
      });

      expect(loadingDuring).toBe(true);
      expect(store.loading()).toBe(false);
    });

    it('should clear any previous error on start', () => {
      store.exposedSetError({ message: 'old error' });

      store.doWithLoading(of('ok')).subscribe();

      expect(store.error()).toBeNull();
    });

    it('should set error and loading to false on failure', () => {
      const httpError = { message: 'Server Error', status: 500 };

      store.doWithLoading(throwError(() => httpError)).subscribe({ error: () => {} });

      expect(store.loading()).toBe(false);
      expect(store.error()).toEqual({ message: 'Server Error', code: 500 });
    });

    it('should use a default error message when none is provided', () => {
      store.doWithLoading(throwError(() => ({}))).subscribe({ error: () => {} });

      expect(store.error()?.message).toBe('An error occurred');
    });

    it('should re-throw the error to the subscriber', () => {
      const original = new Error('boom');
      let caughtError: unknown;

      store
        .doWithLoading(throwError(() => original))
        .subscribe({ error: (e) => (caughtError = e) });

      expect(caughtError).toBe(original);
    });
  });
});
