import { createTerminus } from '@godaddy/terminus';
import { tracingService } from './monitoring/tracing';
import { config } from './config';
import { logger } from './utils/logger';
import { createApp } from './app';
import { healthService } from './monitoring/health';

async function bootstrap(): Promise<void> {
  try {
    tracingService.initialize();

    const app = createApp();
    
    const server = app.listen(config.app.port, config.app.host, () => {
      logger.info('Application started successfully', {
        port: config.app.port,
        host: config.app.host,
        environment: config.app.env,
        version: config.app.version,
      });
    });

    createTerminus(server, {
      signal: 'SIGINT',
      signals: ['SIGTERM', 'SIGINT'],
      timeout: 10000,
      
      healthChecks: {
        '/ready': () => healthService.isReady(),
        '/live': () => healthService.isHealthy(),
      },

      onSignal: async () => {
        logger.info('Server is starting cleanup');
        try {
          await tracingService.shutdown();
          logger.info('Tracing service shut down');
        } catch (error) {
          logger.error('Error during tracing shutdown', error as Error);
        }
      },

      onShutdown: async () => {
        logger.info('Cleanup finished, server is shutting down');
      },

      beforeShutdown: async () => {
        logger.info('Server is shutting down');
        return new Promise(resolve => {
          setTimeout(resolve, 1000);
        });
      },

      logger: (msg: string, err?: Error) => {
        if (err) {
          logger.error(msg, err);
        } else {
          logger.info(msg);
        }
      }
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', reason as Error, {
        promise: promise.toString(),
      });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start application', error as Error);
    process.exit(1);
  }
}

bootstrap();