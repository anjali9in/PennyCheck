import { apiGet, apiPost } from '@/services/api';
import { getDeviceRequest } from './deviceIdentity';
import { AuthResponse, UserProfile } from './types';

export async function registerWithEmail(input: { name: string; email: string; password: string }) {
  const device = await getDeviceRequest();
  return apiPost<AuthResponse>('/auth/register', { ...input, device });
}

export async function loginWithEmail(input: { email: string; password: string }) {
  const device = await getDeviceRequest();
  return apiPost<AuthResponse>('/auth/login', { ...input, device });
}

export async function requestPasswordReset(email: string) {
  return apiPost<{ accepted: boolean; developmentToken?: string | null }>('/auth/forgot-password', { email });
}

export async function logoutSession(refreshToken: string) {
  return apiPost<{ accepted: boolean }>('/auth/logout', { refreshToken });
}

export async function loadProfile(accessToken: string) {
  return apiGet<UserProfile>('/users/me', accessToken);
}
