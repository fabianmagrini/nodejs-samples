import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { config } from './config';
import { logger } from './utils/logger';
import { healthService } from './monitoring/health';
import { metricsService } from './monitoring/metrics';
import { userRoutes } from './routes/users';
import { correlationIdMiddleware, requestLoggingMiddleware, errorLoggingMiddleware } from './middleware/logging';
import { metricsMiddleware } from './middleware/metrics';
import { errorHandler, notFoundHandler } from './middleware/error';
import { rateLimitMiddleware, slowDownMiddleware, connectionLimitMiddleware, timeoutMiddleware } from './middleware/resilience';

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(correlationIdMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(metricsMiddleware);
  app.use(connectionLimitMiddleware);
  app.use(timeoutMiddleware(config.resilience.timeout.request));

  if (config.app.env === 'production') {
    app.use(rateLimitMiddleware);
    app.use(slowDownMiddleware);
  }

  app.get('/', (req, res) => {
    res.json({
      message: 'Twelve Factor App API',
      version: config.app.version,
      environment: config.app.env,
      timestamp: new Date().toISOString(),
    });
  });

  app.get(config.monitoring.healthPath, healthService.handleHealthCheck.bind(healthService));
  app.get('/ready', healthService.handleReadinessCheck.bind(healthService));
  app.get('/live', healthService.handleLivenessCheck.bind(healthService));
  app.get(config.monitoring.metricsPath, metricsService.handleMetricsEndpoint.bind(metricsService));

  app.use('/api/users', userRoutes);

  app.use(notFoundHandler);
  app.use(errorLoggingMiddleware);
  app.use(errorHandler);

  return app;
}