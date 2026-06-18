import * as SecureStore from 'expo-secure-store';
import { AuthResponse } from './types';

const accessTokenKey = 'pennycheck.accessToken';
const refreshTokenKey = 'pennycheck.refreshToken';
const accessTokenExpiresAtKey = 'pennycheck.accessTokenExpiresAt';
const userIdKey = 'pennycheck.userId';
const deviceIdKey = 'pennycheck.deviceId';
const emailKey = 'pennycheck.email';

export type StoredAuthSession = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  userId: string;
  deviceId: string;
  email: string;
};

export async function saveAuthSession(response: AuthResponse | StoredAuthSession) {
  await Promise.all([
    SecureStore.setItemAsync(accessTokenKey, response.accessToken),
    SecureStore.setItemAsync(refreshTokenKey, response.refreshToken),
    SecureStore.setItemAsync(accessTokenExpiresAtKey, response.accessTokenExpiresAt),
    SecureStore.setItemAsync(userIdKey, response.userId),
    SecureStore.setItemAsync(deviceIdKey, response.deviceId),
    SecureStore.setItemAsync(emailKey, response.email),
  ]);
}

export async function loadAuthSession(): Promise<StoredAuthSession | null> {
  const [accessToken, refreshToken, accessTokenExpiresAt, userId, deviceId, email] = await Promise.all([
    SecureStore.getItemAsync(accessTokenKey),
    SecureStore.getItemAsync(refreshTokenKey),
    SecureStore.getItemAsync(accessTokenExpiresAtKey),
    SecureStore.getItemAsync(userIdKey),
    SecureStore.getItemAsync(deviceIdKey),
    SecureStore.getItemAsync(emailKey),
  ]);

  if (!accessToken || !refreshToken || !accessTokenExpiresAt || !userId || !deviceId || !email) {
    return null;
  }

  return { accessToken, refreshToken, accessTokenExpiresAt, userId, deviceId, email };
}

export async function clearAuthSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(accessTokenKey),
    SecureStore.deleteItemAsync(refreshTokenKey),
    SecureStore.deleteItemAsync(accessTokenExpiresAtKey),
    SecureStore.deleteItemAsync(userIdKey),
    SecureStore.deleteItemAsync(deviceIdKey),
    SecureStore.deleteItemAsync(emailKey),
  ]);
}
