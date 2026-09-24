import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfigService } from '../config/app-config.service';

/**
 * Aplica a una INestApplication el contrato común de la API.
 *
 * `main.ts` y los tests e2e llaman a esta misma función: así el test ejercita
 * la aplicación real (con prefijo global, pipes y Swagger) y no una variante
 * creada a mano. Si esta configuración se duplicara, una regresión del contrato
 * pasaría desapercibida porque el test validaría otra aplicación.
 */
export function setupApp(app: INestApplication): void {
  const config = app.get(AppConfigService);

  // Validación de entrada global:
  // whitelist: true    → elimina campos que no están en el DTO
  // transform: true    → convierte tipos (string "123" → number 123)
  // forbidNonWhitelisted: false → NO lanza error por campos extra
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Prefijo global: es el contrato de la API. El front llama a /api/*, así que
  // sin esto el proxy del front no encuentra ninguna ruta.
  app.setGlobalPrefix('api');

  // Swagger se monta solo con SWAGGER_ENABLED exactamente 'true'. Apagado por
  // defecto: la documentación no debe quedar expuesta sin una decisión explícita.
  if (config.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('API')
      .setDescription('API documentation')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.enableShutdownHooks();
}
