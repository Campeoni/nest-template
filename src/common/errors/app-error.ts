import { ErrorCode } from './error-codes';

export class AppError extends Error {
  public readonly timestamp: string;

  constructor(
    /** Código único de error, ej: WHATSAPP_002 */
    public readonly code: ErrorCode,
    message: string,
    /** HTTP status code (default 500) */
    public readonly statusCode: number = 500,
    /** Payload adicional para debugging */
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.timestamp = new Date().toISOString();
  }
}
