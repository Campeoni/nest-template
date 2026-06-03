import { IsNumber, IsOptional, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Logger } from '@nestjs/common';

/**
 * Schema de variables de entorno.
 *
 * Agregá acá TODAS las variables que usa tu aplicación.
 * El servidor NO ARRANCA si falta una variable sin @IsOptional().
 */
export class EnvironmentVariables {
  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  // ─── Ejemplos ─────────────────────────────────────
  // Borralos y poné los tuyos:
  //
  // @IsString()
  // DATABASE_URL!: string;
  //
  // @IsString()
  // @IsOptional()
  // LOG_LEVEL: string = 'log';
}

/**
 * Valida las variables de entorno al arrancar la aplicación.
 * Se usa en ConfigModule.forRoot({ validate }).
 */
export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: true,
  });

  if (errors.length > 0) {
    const logger = new Logger('Config');
    logger.fatal('⛔ Configuración inválida — el servidor no arrancará:');
    for (const err of errors) {
      const constraints = Object.values(err.constraints ?? {}).join(', ');
      logger.fatal(`  • ${err.property}: ${constraints}`);
    }
    logger.fatal('Revisá tu archivo .env. Usá .env.template como referencia.');
    process.exit(1);
  }

  return validated;
}
