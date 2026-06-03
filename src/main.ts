import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación de entrada global:
  // whitelist: true    → elimina campos que no están en el DTO
  // transform: true    → convierte tipos (string "123" → number 123)
  // forbidNonWhitelisted: false → NO lanza error por campos extra
  const config = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.enableShutdownHooks();

  await app.listen(config.port);
  logger.log(`Server running on http://localhost:${config.port}`);
}
bootstrap().catch(console.error);
