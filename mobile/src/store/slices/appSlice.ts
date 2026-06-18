import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

type AppState = {
  appLockEnabled: boolean;
  defaultCurrency: string;
  syncStatus: 'idle' | 'pending' | 'syncing' | 'failed';
  pendingSyncCount: number;
  lastSuccessfulSyncAt: string | null;
  syncError: string | null;
  isLocked: boolean;
};

const initialState: AppState = {
  appLockEnabled: true,
  defaultCurrency: 'INR',
  syncStatus: 'idle',
  pendingSyncCount: 0,
  lastSuccessfulSyncAt: null,
  syncError: null,
  isLocked: false,
};

export const refreshSyncStatus = createAsyncThunk('app/refreshSyncStatus', async () => {
  const { pendingSyncCount } = await import('@/services/syncService');
  return pendingSyncCount();
});

export const syncNow = createAsyncThunk(
  'app/syncNow',
  async (_, thunkApi) => {
    const state = thunkApi.getState() as { auth: { accessToken: string | null } };
    if (!state.auth.accessToken) {
      throw new Error('Sign in before syncing');
    }
    const { pendingSyncCount, performSync } = await import('@/services/syncService');
    const result = await performSync(state.auth.accessToken);
    return { ...result, pending: await pendingSyncCount(), syncedAt: new Date().toISOString() };
  },
);

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setSyncStatus(state, action: PayloadAction<AppState['syncStatus']>) {
      state.syncStatus = action.payload;
    },
    setDefaultCurrency(state, action: PayloadAction<string>) {
      state.defaultCurrency = action.payload;
    },
    lockApp(state) {
      if (state.appLockEnabled) {
        state.isLocked = true;
      }
    },
    unlockApp(state) {
      state.isLocked = false;
    },
    setAppLockEnabled(state, action: PayloadAction<boolean>) {
      state.appLockEnabled = action.payload;
      if (!action.payload) {
        state.isLocked = false;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshSyncStatus.fulfilled, (state, action: PayloadAction<number>) => {
        state.pendingSyncCount = action.payload;
        state.syncStatus = action.payload > 0 ? 'pending' : 'idle';
      })
      .addCase(syncNow.pending, (state) => {
        state.syncStatus = 'syncing';
        state.syncError = null;
      })
      .addCase(syncNow.fulfilled, (state, action) => {
        state.pendingSyncCount = action.payload.pending;
        state.lastSuccessfulSyncAt = action.payload.syncedAt;
        state.syncStatus = action.payload.pending > 0 ? 'pending' : 'idle';
      })
      .addCase(syncNow.rejected, (state, action) => {
        state.syncStatus = 'failed';
        state.syncError = action.error.message ?? 'Sync failed';
      });
  },
});

export const { lockApp, setAppLockEnabled, setDefaultCurrency, setSyncStatus, unlockApp } = appSlice.actions;
export const appReducer = appSlice.reducer;
