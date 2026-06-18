import Constants from 'expo-constants';
import { ApiEnvelope, ApiError } from '@/types/api';

const apiBaseUrl =
  Constants.expoConfig?.extra?.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1';

function createCorrelationId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function apiGet<T>(path: string, accessToken?: string): Promise<T> {
  return apiRequest<T>(path, { method: 'GET', accessToken });
}

export async function apiPost<T>(path: string, body?: unknown, accessToken?: string): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
    accessToken,
  });
}

export async function apiDelete<T>(path: string, accessToken?: string): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE', accessToken });
}

async function apiRequest<T>(
  path: string,
  options: { method: string; body?: string; accessToken?: string },
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Correlation-ID': createCorrelationId(),
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: options.body,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(error?.message ?? `API request failed with status ${response.status}`);
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;
  return envelope.data;
}
