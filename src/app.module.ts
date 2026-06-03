import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { HttpClientModule } from './common/http/http-client.module';
import { AppErrorFilter } from './common/errors/app-error.filter';
import { AppConfigModule } from './config/app-config.module';
import { validateEnv } from './config/env.config';
import { HealthModule } from './health/health.module';
import { RequestIdMiddleware } from './common/logger/request-id.middleware';

/**
 * Módulo raíz de la aplicación.
 *
 * Este template incluye:
 *  - ConfigModule con validación al arranque
 *  - AppConfigService: acceso tipado a variables de entorno
 *  - RequestIdMiddleware + AppLogger: trazabilidad con request ID
 *  - AppErrorFilter + AppError + ErrorCodes: errores estructurados
 *  - HttpClientService con timeout configurable
 *  - HealthController: GET /health
 *  - Graceful shutdown habilitado
 *
 * Agregá acá tus módulos de dominio (UsersModule, OrdersModule, etc.).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    AppConfigModule,
    HealthModule,
    HttpClientModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AppErrorFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
