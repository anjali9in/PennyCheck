export type DeviceRequest = {
  deviceName: string;
  platform: string;
  deviceFingerprint: string;
  pushToken?: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  userId: string;
  deviceId: string;
  email: string;
  emailVerified: boolean;
  developmentEmailVerificationToken?: string | null;
};

export type RefreshTokenResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  defaultCurrency: string;
  timezone: string;
  financialMonthStartDay: number;
};

export type DeviceSession = {
  id: string;
  deviceName: string;
  platform: string;
  lastSeenAt?: string | null;
  remoteLoggedOutAt?: string | null;
  createdAt: string;
};
