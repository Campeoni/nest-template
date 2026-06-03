/**
 * Códigos de error del sistema.
 * Formato: {MODULO}_{NUMERO}
 * Únicos, rastreables, fáciles de buscar en logs.
 */
export const ErrorCodes = {
  // Autenticación
  AUTH_MISSING_KEY: 'AUTH_001',
  AUTH_INVALID_KEY: 'AUTH_002',

  // HTTP Cliente
  HTTP_REQUEST_FAILED: 'HTTP_001',
  HTTP_CONNECTION_ERROR: 'HTTP_002',
  HTTP_TIMEOUT: 'HTTP_003',

  // Archivos
  FILE_SAVE_ERROR: 'FILE_001',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
