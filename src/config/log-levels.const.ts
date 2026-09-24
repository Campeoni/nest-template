// Niveles de log en orden de severidad creciente.
// Elegir un nivel habilita ese nivel y todos los superiores:
// LOG_LEVEL=warn emite warn, error y fatal, y descarta el resto.
export const LOG_LEVELS = [
  'verbose',
  'debug',
  'log',
  'warn',
  'error',
  'fatal',
] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];
