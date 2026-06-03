import { Logger } from '@nestjs/common';
import { getRequestId } from './request-context';

/**
 * Logger que incluye el request ID en cada mensaje automáticamente.
 *
 * Usar igual que Logger de NestJS:
 *
 *   private readonly logger = new AppLogger(WhatsappService.name);
 *
 * La salida: `[a1b2c3d4] Image saved: ...`
 * Si no hay request activo: `[--] Image saved: ...`
 */
export class AppLogger extends Logger {
  constructor(context: string) {
    super(context);
  }

  log(message: string, ...optionalParams: unknown[]) {
    super.log(`[${getRequestId()}] ${message}`, ...optionalParams);
  }

  error(message: string, ...optionalParams: unknown[]) {
    super.error(`[${getRequestId()}] ${message}`, ...optionalParams);
  }

  warn(message: string, ...optionalParams: unknown[]) {
    super.warn(`[${getRequestId()}] ${message}`, ...optionalParams);
  }

  debug(message: string, ...optionalParams: unknown[]) {
    super.debug(`[${getRequestId()}] ${message}`, ...optionalParams);
  }

  verbose(message: string, ...optionalParams: unknown[]) {
    super.verbose(`[${getRequestId()}] ${message}`, ...optionalParams);
  }
}
