import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AppError } from './app-error';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    requestId: string;
    timestamp: string;
    details?: unknown;
  };
}

@Catch()
export class AppErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId =
      (request as Request & { requestId?: string }).requestId ?? '--';
    const body = this.normalizeError(exception, requestId);

    response.status(body.error.statusCode).json(body);
  }

  private normalizeError(exception: unknown, requestId: string): ErrorResponse {
    const error = {
      requestId,
      timestamp: new Date().toISOString(),
    };

    // AppError propio — código + metadata estructurada
    if (exception instanceof AppError) {
      return {
        success: false,
        error: {
          ...error,
          code: exception.code,
          message: exception.message,
          statusCode: exception.statusCode,
          ...(exception.details ? { details: exception.details } : {}),
        },
      };
    }

    // HttpException de NestJS (incluye UnauthorizedException, BadRequestException, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : (((res as Record<string, any>)['message'] as string | string[]) ??
            exception.message);

      return {
        success: false,
        error: {
          ...error,
          code: `HTTP_${status}`,
          message: Array.isArray(message) ? message.join('; ') : message,
          statusCode: status,
        },
      };
    }

    // Error inesperado — fallback
    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    return {
      success: false,
      error: {
        ...error,
        code: 'INTERNAL_000',
        message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
    };
  }
}
