import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../monitoring/metrics';

interface RequestWithStartTime extends Request {
  startTime?: number;
}

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const request = req as RequestWithStartTime;
  request.startTime = Date.now();

  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - (request.startTime || Date.now());
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    
    const requestSize = req.headers['content-length'] 
      ? parseInt(req.headers['content-length'] as string, 10) 
      : undefined;
    
    const responseSize = Buffer.byteLength(body || '', 'utf8');

    metricsService.recordHttpRequest(
      method,
      route,
      statusCode,
      duration,
      requestSize,
      responseSize
    );

    return originalSend.call(this, body);
  };

  next();
};