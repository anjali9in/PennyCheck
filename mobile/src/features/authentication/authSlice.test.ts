/// <reference types="jest" />
/* eslint-disable import/first */

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('./authApi', () => ({
  loadProfile: jest.fn(),
  loginWithEmail: jest.fn(),
  logoutSession: jest.fn(),
  registerWithEmail: jest.fn(),
  requestPasswordReset: jest.fn(),
}));

import { authReducer, login, logout, restoreAuthSession } from './authSlice';
import { AuthResponse } from './types';

const authResponse: AuthResponse = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  accessTokenExpiresAt: '2026-06-18T12:00:00Z',
  userId: 'user-id',
  deviceId: 'device-id',
  email: 'user@example.com',
  emailVerified: false,
  developmentEmailVerificationToken: 'verify-token',
};

describe('authSlice', () => {
  it('restores unauthenticated state when no secure session exists', () => {
    const state = authReducer(undefined, restoreAuthSession.fulfilled(null, 'request-id'));

    expect(state.status).toBe('unauthenticated');
    expect(state.accessToken).toBeNull();
  });

  it('stores login token metadata', () => {
    const state = authReducer(undefined, login.fulfilled(authResponse, 'request-id', {
      email: 'user@example.com',
      password: 'password123',
    }));

    expect(state.status).toBe('authenticated');
    expect(state.accessToken).toBe('access-token');
    expect(state.refreshToken).toBe('refresh-token');
    expect(state.email).toBe('user@example.com');
  });

  it('clears token metadata on logout', () => {
    const loggedIn = authReducer(undefined, login.fulfilled(authResponse, 'request-id', {
      email: 'user@example.com',
      password: 'password123',
    }));

    const state = authReducer(loggedIn, logout.fulfilled(undefined, 'request-id', 'refresh-token'));

    expect(state.status).toBe('unauthenticated');
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });
});
