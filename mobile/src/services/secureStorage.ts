import { Platform } from 'react-native';

type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string, options?: Record<string, unknown>) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
  isAvailableAsync?: () => Promise<boolean>;
  WHEN_UNLOCKED_THIS_DEVICE_ONLY?: number;
};

const memoryStore = new Map<string, string>();

export async function getSecureItem(key: string) {
  if (Platform.OS === 'web') {
    return readWebStorage(key);
  }
  const secureStore = await loadSecureStore();
  if (!secureStore) {
    return memoryStore.get(key) ?? null;
  }
  return secureStore.getItemAsync(key);
}

export async function setSecureItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    writeWebStorage(key, value);
    return;
  }
  const secureStore = await loadSecureStore();
  if (!secureStore) {
    memoryStore.set(key, value);
    return;
  }
  await secureStore.setItemAsync(key, value, {
    keychainAccessible: secureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function deleteSecureItem(key: string) {
  if (Platform.OS === 'web') {
    deleteWebStorage(key);
    return;
  }
  const secureStore = await loadSecureStore();
  if (!secureStore) {
    memoryStore.delete(key);
    return;
  }
  await secureStore.deleteItemAsync(key);
}

async function loadSecureStore(): Promise<SecureStoreModule | null> {
  try {
    const secureStore = await import('expo-secure-store') as SecureStoreModule;
    if (secureStore.isAvailableAsync && !(await secureStore.isAvailableAsync())) {
      return null;
    }
    return secureStore;
  } catch {
    return null;
  }
}

function readWebStorage(key: string) {
  if (typeof window === 'undefined') {
    return memoryStore.get(key) ?? null;
  }
  return window.localStorage.getItem(key);
}

function writeWebStorage(key: string, value: string) {
  if (typeof window === 'undefined') {
    memoryStore.set(key, value);
    return;
  }
  window.localStorage.setItem(key, value);
}

function deleteWebStorage(key: string) {
  if (typeof window === 'undefined') {
    memoryStore.delete(key);
    return;
  }
  window.localStorage.removeItem(key);
}
