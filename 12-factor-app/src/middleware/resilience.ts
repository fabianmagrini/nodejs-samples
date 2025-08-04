import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { metricsService } from '../monitoring/metrics';
import { logger } from '../utils/logger';

export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    metricsService.recordError('rate_limit_exceeded', req.method, req.route?.path);
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
    });
    
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

export const slowDownMiddleware = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: 500,
  maxDelayMs: 20000,
  onLimitReached: (req: Request) => {
    metricsService.recordError('slow_down_triggered', req.method, req.route?.path);
    logger.warn('Slow down middleware triggered', {
      ip: req.ip,
      method: req.method,
      url: req.url,
    });
  },
});

export const connectionLimitMiddleware = (() => {
  let activeConnections = 0;
  const maxConnections = 1000;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (activeConnections >= maxConnections) {
      metricsService.recordError('connection_limit_exceeded', req.method, req.route?.path);
      logger.warn('Connection limit exceeded', {
        activeConnections,
        maxConnections,
        ip: req.ip,
      });
      
      res.status(503).json({
        error: 'Service temporarily unavailable - too many active connections',
        retryAfter: '30 seconds',
      });
      return;
    }

    activeConnections++;
    metricsService.incrementActiveConnections();

    res.on('finish', () => {
      activeConnections--;
      metricsService.decrementActiveConnections();
    });

    res.on('close', () => {
      activeConnections--;
      metricsService.decrementActiveConnections();
    });

    next();
  };
})();

export const timeoutMiddleware = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        metricsService.recordError('request_timeout', req.method, req.route?.path);
        logger.warn('Request timeout', {
          method: req.method,
          url: req.url,
          timeout: timeoutMs,
        });
        
        res.status(408).json({
          error: 'Request timeout',
          timeout: `${timeoutMs}ms`,
        });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
};