import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';

/**
 * Módulo global de configuración.
 * AppConfigService está disponible en toda la app sin importar este módulo.
 */
@Global()
@Module({
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
