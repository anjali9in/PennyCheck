import { deleteSecureItem, getSecureItem, setSecureItem } from '@/services/secureStorage';
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
    setSecureItem(accessTokenKey, response.accessToken),
    setSecureItem(refreshTokenKey, response.refreshToken),
    setSecureItem(accessTokenExpiresAtKey, response.accessTokenExpiresAt),
    setSecureItem(userIdKey, response.userId),
    setSecureItem(deviceIdKey, response.deviceId),
    setSecureItem(emailKey, response.email),
  ]);
}

export async function loadAuthSession(): Promise<StoredAuthSession | null> {
  const [accessToken, refreshToken, accessTokenExpiresAt, userId, deviceId, email] = await Promise.all([
    getSecureItem(accessTokenKey),
    getSecureItem(refreshTokenKey),
    getSecureItem(accessTokenExpiresAtKey),
    getSecureItem(userIdKey),
    getSecureItem(deviceIdKey),
    getSecureItem(emailKey),
  ]);

  if (!accessToken || !refreshToken || !accessTokenExpiresAt || !userId || !deviceId || !email) {
    return null;
  }

  return { accessToken, refreshToken, accessTokenExpiresAt, userId, deviceId, email };
}

export async function clearAuthSession() {
  await Promise.all([
    deleteSecureItem(accessTokenKey),
    deleteSecureItem(refreshTokenKey),
    deleteSecureItem(accessTokenExpiresAtKey),
    deleteSecureItem(userIdKey),
    deleteSecureItem(deviceIdKey),
    deleteSecureItem(emailKey),
  ]);
}
