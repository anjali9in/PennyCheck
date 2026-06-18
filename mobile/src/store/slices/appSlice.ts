import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type AppState = {
  appLockEnabled: boolean;
  defaultCurrency: string;
  syncStatus: 'idle' | 'pending' | 'syncing' | 'failed';
};

const initialState: AppState = {
  appLockEnabled: true,
  defaultCurrency: 'INR',
  syncStatus: 'idle',
};

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
  },
});

export const { setDefaultCurrency, setSyncStatus } = appSlice.actions;
export const appReducer = appSlice.reducer;
