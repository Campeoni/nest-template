import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { FileLogger } from './logging/file-logger.service';
import { runCli } from './cli/cli-runner';
import { setupApp } from './bootstrap/setup-app';

async function bootstrap() {
  // El logger se crea antes que la aplicación. Se pasa a NestFactory.create
  // para que los logs del propio arranque (carga de módulos, mapeo de rutas)
  // también respeten LOG_LEVEL, y se deja instalado como global con useLogger.
  const logger = new FileLogger();
  const app = await NestFactory.create(AppModule, { logger });
  app.useLogger(logger);

  // Contrato común de la API (pipes, prefijo /api, Swagger, shutdown). Vive en
  // un helper compartido para que el arranque y los tests e2e apliquen la misma
  // configuración y no puedan divergir.
  setupApp(app);

  const config = app.get(AppConfigService);

  await app.listen(config.port);

  // Línea de arranque: se emite SIEMPRE, sin importar LOG_LEVEL. Es la señal
  // de vida del proceso, y sin ella una instalación con LOG_LEVEL=warn queda
  // sin forma de confirmar que la app quedó levantada.
  logger.banner(`✅ Listening on http://localhost:${config.port}`, 'Bootstrap');
  // El operador necesita saber dónde quedó el log sin buscarlo a ciegas.
  logger.banner(logger.logDestination, 'Bootstrap');
  logger.log(
    config.swaggerEnabled
      ? `Swagger docs on http://localhost:${config.port}/api/docs`
      : 'Swagger docs disabled',
    'Bootstrap',
  );
}

// Despacho del punto de entrada. Sin argumentos arranca el servidor HTTP; con
// argumentos la intención es un comando de CLI, así que no se abre ningún
// puerto: se resuelve el comando y se sale con su código de salida.
const cliArgs = process.argv.slice(2);
if (cliArgs.length > 0) {
  runCli(cliArgs)
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      console.error('⛔ El comando falló:');
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
} else {
  bootstrap().catch(console.error);
}
