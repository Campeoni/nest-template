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

  // ─── Agregá acá tus propiedades ──────────────────────
  //
  // get databaseUrl(): string {
  //   return this.configService.get<string>('DATABASE_URL')!;
  // }
  //
  // get logLevel(): string {
  //   return this.configService.get<string>('LOG_LEVEL', 'log');
  // }
}
