import { IsNumber, IsOptional, IsString, validateSync } from 'class-validator';
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

  // Nivel mínimo de log. Elegir uno habilita ese nivel y los superiores.
  // Se valida como texto y NO con una lista cerrada a propósito: un error de
  // tipeo en una variable de logging no puede impedir que la aplicación
  // arranque. El FileLogger normaliza el valor y cae a 'log' si no lo reconoce.
  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'log';

  // Carpeta del archivo de log. Si no se define, se usa el directorio de
  // trabajo (o la carpeta del ejecutable si está empaquetado). Admite rutas
  // relativas: se resuelven contra el directorio de trabajo del proceso.
  @IsString()
  @IsOptional()
  LOG_DIR: string;

  // Fuerza el archivo de log en desarrollo (true|false). Sin esta variable,
  // en desarrollo el log va únicamente a consola.
  // Se valida como texto y no como booleano a propósito: con
  // enableImplicitConversion, class-transformer convierte cualquier string
  // no vacío con Boolean(), así que 'false' terminaría siendo true.
  // Solo el valor exacto 'true' lo enciende; cualquier otro lo deja apagado,
  // sin cortar el arranque.
  @IsString()
  @IsOptional()
  LOG_TO_FILE: string;

  // Nombre del archivo de log dentro de LOG_DIR. Default: app.log.
  @IsString()
  @IsOptional()
  LOG_FILE: string = 'app.log';

  // Habilita la documentación Swagger en /api/docs. Apagado por defecto: la
  // documentación no debe quedar expuesta sin una decisión explícita. Solo el
  // valor exacto 'true' la enciende; cualquier otro la deja apagada, sin cortar
  // el arranque.
  @IsString()
  @IsOptional()
  SWAGGER_ENABLED: string;
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
