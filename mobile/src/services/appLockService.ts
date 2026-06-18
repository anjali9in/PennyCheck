import { getSecureItem, setSecureItem } from '@/services/secureStorage';

const pinKey = 'pennycheck.pin';

export async function setAppPin(pin: string) {
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error('PIN must be 4 to 8 digits');
  }
  await setSecureItem(pinKey, pin);
}

export async function hasAppPin() {
  return Boolean(await getSecureItem(pinKey));
}

export async function verifyAppPin(pin: string) {
  const stored = await getSecureItem(pinKey);
  return Boolean(stored && stored === pin);
}

export async function authenticateWithBiometrics() {
  const LocalAuthentication = await import('expo-local-authentication').catch(() => null);
  if (!LocalAuthentication) {
    return false;
  }
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!compatible || !enrolled) {
    return false;
  }
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock PennyCheck',
    cancelLabel: 'Use PIN',
    disableDeviceFallback: false,
  });
  return result.success;
}
