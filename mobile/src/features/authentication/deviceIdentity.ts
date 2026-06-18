import { Platform } from 'react-native';
import { getSecureItem, setSecureItem } from '@/services/secureStorage';
import { DeviceRequest } from './types';

const deviceFingerprintKey = 'pennycheck.deviceFingerprint';

function randomId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

export async function getDeviceRequest(): Promise<DeviceRequest> {
  let fingerprint = await getSecureItem(deviceFingerprintKey);
  if (!fingerprint) {
    fingerprint = randomId();
    await setSecureItem(deviceFingerprintKey, fingerprint);
  }

  return {
    deviceName: `${Platform.OS} device`,
    platform: Platform.OS,
    deviceFingerprint: fingerprint,
  };
}
