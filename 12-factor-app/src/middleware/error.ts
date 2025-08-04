import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { metricsService } from '../monitoring/metrics';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  metricsService.recordError('application_error', req.method, req.route?.path);

  logger.error('Application error', error, {
    method: req.method,
    url: req.url,
    statusCode,
    ip: req.ip,
    userAgent: req.headers['user-agent'] as string,
  });

  const errorResponse: {
    error: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
    stack?: string;
  } = {
    error: statusCode >= 500 ? 'Internal Server Error' : 'Client Error',
    message: error.message || 'An unexpected error occurred',
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.url,
  };

  if (!isProduction) {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  metricsService.recordError('not_found', req.method, req.path);
  
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip,
  });

  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
    path: req.url,
  });
};