import { Injectable, HttpStatus } from '@nestjs/common';
import { AppError } from '../errors/app-error';
import { ErrorCodes } from '../errors/error-codes';
import { AppLogger } from '../logger/app-logger.service';

/** Default timeout para llamadas externas: 10 segundos */
const DEFAULT_TIMEOUT = 10_000;

@Injectable()
export class HttpClientService {
  private readonly logger = new AppLogger(HttpClientService.name);

  /**
   * Realiza una petición HTTP genérica utilizando fetch nativo.
   *
   * @param url     URL del servicio externo
   * @param options Opciones de fetch (method, headers, body, etc.)
   * @param timeout Timeout en milisegundos (default 10s). 0 = sin timeout.
   */
  async request<T>(
    url: string,
    options: RequestInit = {},
    timeout = DEFAULT_TIMEOUT,
  ): Promise<T> {
    const method = options.method || 'GET';
    const startTime = Date.now();

    // ── Timeout con AbortController ──────────────────────────
    const controller = new AbortController();
    const timeoutId =
      timeout > 0 ? setTimeout(() => controller.abort(), timeout) : undefined;

    const fetchOptions: RequestInit = {
      ...options,
      signal: options.signal ?? controller.signal,
    };

    this.logger.log(`[HTTP Request] ${method} ${url} (timeout: ${timeout}ms)`);

    try {
      const response = await fetch(url, fetchOptions);
      const duration = Date.now() - startTime;

      this.logger.log(
        `[HTTP Response] ${method} ${url} → ${response.status} (${duration}ms)`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `[HTTP Error] ${method} ${url} - Status: ${response.status} - ${errorText}`,
        );

        throw new AppError(
          ErrorCodes.HTTP_REQUEST_FAILED,
          `External HTTP request failed: ${method} ${url}`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
          { details: errorText },
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return (await response.json()) as T;
      }

      return (await response.text()) as unknown as T;
    } catch (error) {
      // Ya es un AppError nuestro — lo dejamos pasar
      if (error instanceof AppError) {
        throw error;
      }

      // Timeout por AbortController
      if (
        timeout > 0 &&
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        const duration = Date.now() - startTime;
        this.logger.error(
          `[HTTP Timeout] ${method} ${url} — no response after ${timeout}ms`,
        );

        throw new AppError(
          ErrorCodes.HTTP_TIMEOUT,
          `External service timed out: ${method} ${url} after ${timeout}ms`,
          HttpStatus.GATEWAY_TIMEOUT,
          { duration, timeout },
        );
      }

      // Error de conexión (DNS, refused, network)
      const duration = Date.now() - startTime;
      this.logger.error(
        `[HTTP Connection Error] ${method} ${url} after ${duration}ms — ${
          error instanceof Error ? error.message : error
        }`,
      );

      throw new AppError(
        ErrorCodes.HTTP_CONNECTION_ERROR,
        `Failed to connect to external service: ${method} ${url}`,
        HttpStatus.BAD_GATEWAY,
        { error: error instanceof Error ? error.message : String(error) },
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Petición HTTP POST simplificada.
   */
  async post<T>(
    url: string,
    body: any,
    headers: Record<string, string> = {},
    timeout = DEFAULT_TIMEOUT,
  ): Promise<T> {
    return this.request<T>(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
      },
      timeout,
    );
  }

  /**
   * Petición HTTP GET simplificada.
   */
  async get<T>(
    url: string,
    headers: Record<string, string> = {},
    timeout = DEFAULT_TIMEOUT,
  ): Promise<T> {
    return this.request<T>(
      url,
      {
        method: 'GET',
        headers,
      },
      timeout,
    );
  }
}
