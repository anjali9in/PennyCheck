/// <reference types="jest" />

import { appReducer, setDefaultCurrency, setSyncStatus } from './appSlice';

describe('appSlice', () => {
  it('updates sync status', () => {
    const state = appReducer(undefined, setSyncStatus('pending'));

    expect(state.syncStatus).toBe('pending');
  });

  it('updates default currency', () => {
    const state = appReducer(undefined, setDefaultCurrency('USD'));

    expect(state.defaultCurrency).toBe('USD');
  });
});
