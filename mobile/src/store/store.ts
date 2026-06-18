import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@/features/authentication/authSlice';
import { appReducer } from './slices/appSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: true,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
