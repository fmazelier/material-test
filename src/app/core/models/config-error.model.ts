export type ConfigLoadErrorCode = 'network' | 'http' | 'invalid_format' | 'missing_fields';

export class ConfigLoadError extends Error {
  override readonly name = 'ConfigLoadError';

  constructor(
    public readonly code: ConfigLoadErrorCode,
    message: string,
    public readonly httpStatus?: number,
    public readonly missingFields?: string[]
  ) {
    super(`[Config] ${message}`);
  }
}
