import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { HttpClientModule } from './common/http/http-client.module';
import { AppErrorFilter } from './common/errors/app-error.filter';
import { AppConfigModule } from './config/app-config.module';
import { validateEnv } from './config/env.config';
import { HealthModule } from './health/health.module';
import { RequestIdMiddleware } from './common/logger/request-id.middleware';

// Carpeta del front compilado: `www` junto a `dist`, así funciona tanto si el
// template se usa suelto (raíz www/) como si se copia a back/ de un monorepo
// (back/www, que es donde aterriza el build del front).
const WWW_ROOT = join(__dirname, '..', 'www');

// Sirve el front solo si la carpeta `www` existe. Un back sin front no debe
// fingir que sirve algo: el módulo directamente no se registra.
const staticImports = existsSync(WWW_ROOT)
  ? [
      ServeStaticModule.forRoot({
        rootPath: WWW_ROOT,
        // Las rutas /api/* quedan para la API; todo lo demás cae al index.html
        // para que el ruteo del SPA lo resuelva el front.
        exclude: ['/api/{*path}'],
        renderPath: '/{*path}',
      }),
    ]
  : [];

/**
 * Módulo raíz de la aplicación.
 *
 * Este template incluye:
 *  - ConfigModule con validación al arranque
 *  - AppConfigService: acceso tipado a variables de entorno
 *  - RequestIdMiddleware + AppLogger: trazabilidad con request ID
 *  - AppErrorFilter + AppError + ErrorCodes: errores estructurados
 *  - HttpClientService con timeout configurable
 *  - HealthController: GET /api/health
 *  - ServeStaticModule: sirve el front si existe la carpeta www
 *  - Graceful shutdown habilitado
 *
 * Agregá acá tus módulos de dominio (UsersModule, OrdersModule, etc.).
 */
@Module({
  imports: [
    ...staticImports,
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
    // El comodín va con nombre (`*splat`) porque path-to-regexp v8, el que usa
    // Express 5, ya no acepta el `*` suelto: con el prefijo global `api` el
    // patrón quedaría como `/api/*` y Nest lo marca como ruta no soportada.
    consumer.apply(RequestIdMiddleware).forRoutes('{*splat}');
  }
}
