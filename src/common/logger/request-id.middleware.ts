import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { asyncLocalStorage } from './request-context';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = randomUUID().slice(0, 8);

    // Para el filter de errores
    (req as Request & { requestId?: string }).requestId = requestId;

    // Para el cliente HTTP
    res.setHeader('X-Request-Id', requestId);

    // Para AppLogger via AsyncLocalStorage
    asyncLocalStorage.run({ requestId }, () => {
      next();
    });
  }
}
