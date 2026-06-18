import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { clearAuthSession, loadAuthSession, saveAuthSession, StoredAuthSession } from './authStorage';
import { loadProfile, loginWithEmail, logoutSession, registerWithEmail, requestPasswordReset } from './authApi';
import { AuthResponse, UserProfile } from './types';

type AuthStatus = 'checking' | 'unauthenticated' | 'authenticated' | 'submitting';

type AuthState = {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: string | null;
  userId: string | null;
  deviceId: string | null;
  email: string | null;
  profile: UserProfile | null;
  error: string | null;
  developmentEmailVerificationToken: string | null;
  developmentPasswordResetToken: string | null;
};

const initialState: AuthState = {
  status: 'checking',
  accessToken: null,
  refreshToken: null,
  accessTokenExpiresAt: null,
  userId: null,
  deviceId: null,
  email: null,
  profile: null,
  error: null,
  developmentEmailVerificationToken: null,
  developmentPasswordResetToken: null,
};

export const restoreAuthSession = createAsyncThunk('auth/restore', async () => {
  return loadAuthSession();
});

export const register = createAsyncThunk('auth/register', async (input: { name: string; email: string; password: string }) => {
  const response = await registerWithEmail(input);
  await saveAuthSession(response);
  return response;
});

export const login = createAsyncThunk('auth/login', async (input: { email: string; password: string }) => {
  const response = await loginWithEmail(input);
  await saveAuthSession(response);
  return response;
});

export const loadCurrentProfile = createAsyncThunk('auth/profile', async (accessToken: string) => {
  return loadProfile(accessToken);
});

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async (email: string) => {
  return requestPasswordReset(email);
});

export const logout = createAsyncThunk('auth/logout', async (refreshToken: string | null) => {
  if (refreshToken) {
    await logoutSession(refreshToken).catch(() => undefined);
  }
  await clearAuthSession();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreAuthSession.fulfilled, (state, action: PayloadAction<StoredAuthSession | null>) => {
        if (!action.payload) {
          resetSessionState(state);
          state.status = 'unauthenticated';
          return;
        }
        applyStoredSession(state, action.payload);
        state.status = 'authenticated';
      })
      .addCase(restoreAuthSession.rejected, (state) => {
        resetSessionState(state);
        state.status = 'unauthenticated';
      })
      .addCase(register.pending, (state) => {
        state.status = 'submitting';
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        applyAuthResponse(state, action.payload);
        state.status = 'authenticated';
        state.developmentEmailVerificationToken = action.payload.developmentEmailVerificationToken ?? null;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'unauthenticated';
        state.error = action.error.message ?? 'Registration failed';
      })
      .addCase(login.pending, (state) => {
        state.status = 'submitting';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        applyAuthResponse(state, action.payload);
        state.status = 'authenticated';
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'unauthenticated';
        state.error = action.error.message ?? 'Login failed';
      })
      .addCase(loadCurrentProfile.fulfilled, (state, action: PayloadAction<UserProfile>) => {
        state.profile = action.payload;
      })
      .addCase(forgotPassword.pending, (state) => {
        state.error = null;
        state.developmentPasswordResetToken = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.developmentPasswordResetToken = action.payload.developmentToken ?? null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.error = action.error.message ?? 'Password reset request failed';
      })
      .addCase(logout.fulfilled, (state) => {
        resetSessionState(state);
        state.status = 'unauthenticated';
      });
  },
});

function applyAuthResponse(state: AuthState, response: AuthResponse) {
  state.accessToken = response.accessToken;
  state.refreshToken = response.refreshToken;
  state.accessTokenExpiresAt = response.accessTokenExpiresAt;
  state.userId = response.userId;
  state.deviceId = response.deviceId;
  state.email = response.email;
  state.error = null;
}

function applyStoredSession(state: AuthState, session: StoredAuthSession) {
  state.accessToken = session.accessToken;
  state.refreshToken = session.refreshToken;
  state.accessTokenExpiresAt = session.accessTokenExpiresAt;
  state.userId = session.userId;
  state.deviceId = session.deviceId;
  state.email = session.email;
  state.error = null;
}

function resetSessionState(state: AuthState) {
  state.accessToken = null;
  state.refreshToken = null;
  state.accessTokenExpiresAt = null;
  state.userId = null;
  state.deviceId = null;
  state.email = null;
  state.profile = null;
}

export const { clearAuthError } = authSlice.actions;
export const authReducer = authSlice.reducer;
