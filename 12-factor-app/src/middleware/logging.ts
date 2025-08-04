import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface RequestWithLogging extends Request {
  correlationId: string;
  requestId: string;
  startTime: number;
}

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const request = req as RequestWithLogging;
  request.correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  request.requestId = uuidv4();
  request.startTime = Date.now();

  res.setHeader('x-correlation-id', request.correlationId);
  res.setHeader('x-request-id', request.requestId);

  next();
};

export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const request = req as RequestWithLogging;
  
  logger.logRequest(req, {
    correlationId: request.correlationId,
    requestId: request.requestId,
  });

  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - request.startTime;
    
    logger.logResponse(req, res, duration, {
      correlationId: request.correlationId,
      requestId: request.requestId,
    });

    return originalSend.call(this, body);
  };

  next();
};

export const errorLoggingMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const request = req as RequestWithLogging;
  
  logger.logError(error, {
    correlationId: request.correlationId,
    requestId: request.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'] as string,
  });

  next(error);
};