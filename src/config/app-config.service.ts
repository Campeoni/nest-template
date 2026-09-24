import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Servicio de configuración tipado.
 *
 * En vez de escribir `this.configService.get<string>('DB_URL')` en cada
 * archivo, acá tenés propiedades con tipo, autocompletado, y un solo lugar
 * para refactorizar si cambia una variable de entorno.
 *
 * Regla: todo lo que necesita una variable de entorno lo hace a través
 * de este servicio, nunca con `process.env.X` o `config.get('X')`.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  // Nivel mínimo de log. El FileLogger lee process.env directo (se construye
  // antes de que exista el contenedor de DI), pero el getter queda como acceso
  // tipado para el resto de la aplicación.
  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', 'log');
  }

  // Carpeta del archivo de log. undefined cuando no se configuró.
  get logDir(): string | undefined {
    return this.configService.get<string>('LOG_DIR');
  }

  // Fuerza el archivo de log en desarrollo. undefined cuando no se configuró.
  get logToFile(): string | undefined {
    return this.configService.get<string>('LOG_TO_FILE');
  }

  // Nombre del archivo de log. Default: app.log.
  get logFile(): string {
    return this.configService.get<string>('LOG_FILE', 'app.log');
  }

  // Swagger se monta solo con SWAGGER_ENABLED exactamente 'true'. Cualquier
  // otro valor (o su ausencia) lo deja apagado.
  get swaggerEnabled(): boolean {
    return this.configService.get<string>('SWAGGER_ENABLED') === 'true';
  }

  // ─── Agregá acá tus propiedades ──────────────────────
  //
  // get databaseUrl(): string {
  //   return this.configService.get<string>('DATABASE_URL')!;
  // }
}
