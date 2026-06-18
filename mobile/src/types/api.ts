export type ApiEnvelope<T> = {
  data: T;
  message: string;
  timestamp: string;
};

export type ApiError = {
  code: string;
  message: string;
  correlationId?: string;
  fieldErrors?: Record<string, string>;
  timestamp: string;
};
