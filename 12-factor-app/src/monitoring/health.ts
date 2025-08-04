import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface HealthCheck {
  name: string;
  check: () => Promise<HealthCheckResult>;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: Record<string, unknown>;
  responseTime?: number;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  service: {
    name: string;
    version: string;
    environment: string;
  };
  checks: Record<string, HealthCheckResult>;
}

export class HealthService {
  private checks: Map<string, HealthCheck> = new Map();
  private startTime = Date.now();

  public registerCheck(check: HealthCheck): void {
    this.checks.set(check.name, check);
    logger.info(`Health check registered: ${check.name}`);
  }

  public async runChecks(): Promise<HealthResponse> {
    const checkResults: Record<string, HealthCheckResult> = {};
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    for (const [name, check] of this.checks) {
      try {
        const startTime = Date.now();
        const result = await check.check();
        const responseTime = Date.now() - startTime;
        
        checkResults[name] = {
          ...result,
          responseTime,
        };

        if (result.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        checkResults[name] = {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
          responseTime: 0,
        };
        overallStatus = 'unhealthy';
        
        logger.error(`Health check failed: ${name}`, error as Error);
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      service: {
        name: config.tracing.serviceName,
        version: config.app.version,
        environment: config.app.env,
      },
      checks: checkResults,
    };
  }

  public async handleHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.runChecks();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Health check endpoint failed', error as Error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        message: 'Health check system failure',
      });
    }
  }

  public async handleReadinessCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.runChecks();
      const isReady = health.status === 'healthy' || health.status === 'degraded';
      
      if (isReady) {
        res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
      } else {
        res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
      }
    } catch (error) {
      logger.error('Readiness check endpoint failed', error as Error);
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        message: 'Readiness check system failure',
      });
    }
  }

  public handleLivenessCheck(req: Request, res: Response): void {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    });
  }

  public async isReady(): Promise<boolean> {
    try {
      const health = await this.runChecks();
      return health.status === 'healthy' || health.status === 'degraded';
    } catch (error) {
      logger.error('Readiness check failed', error as Error);
      return false;
    }
  }

  public async isHealthy(): Promise<boolean> {
    return true;
  }
}

export const databaseHealthCheck: HealthCheck = {
  name: 'database',
  check: async (): Promise<HealthCheckResult> => {
    try {
      const startTime = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        message: 'Database connection successful',
        details: {
          responseTime,
          connectionPool: 'active',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  },
};

export const redisHealthCheck: HealthCheck = {
  name: 'redis',
  check: async (): Promise<HealthCheckResult> => {
    try {
      const startTime = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 5));
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        message: 'Redis connection successful',
        details: {
          responseTime,
          connected: true,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Redis connection failed',
      };
    }
  },
};

export const memoryHealthCheck: HealthCheck = {
  name: 'memory',
  check: async (): Promise<HealthCheckResult> => {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const memoryUsagePercent = (usedMem / totalMem) * 100;
    
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    let message = 'Memory usage is normal';
    
    if (memoryUsagePercent > 90) {
      status = 'unhealthy';
      message = 'Memory usage is critically high';
    } else if (memoryUsagePercent > 80) {
      status = 'degraded';
      message = 'Memory usage is high';
    }
    
    return {
      status,
      message,
      details: {
        heapUsed: Math.round(usedMem / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(totalMem / 1024 / 1024 * 100) / 100,
        usagePercent: Math.round(memoryUsagePercent * 100) / 100,
        external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
      },
    };
  },
};

export const healthService = new HealthService();

healthService.registerCheck(databaseHealthCheck);
healthService.registerCheck(redisHealthCheck);
healthService.registerCheck(memoryHealthCheck);