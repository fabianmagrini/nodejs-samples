import { Request, Response } from 'express';
import {
  HealthService,
  HealthCheck,
  databaseHealthCheck,
  redisHealthCheck,
  memoryHealthCheck,
} from './health';
import { logger } from '../utils/logger';

jest.mock('../utils/logger');
jest.mock('../config', () => ({
  config: {
    tracing: {
      serviceName: 'test-service',
    },
    app: {
      version: '1.0.0',
      env: 'test',
    },
  },
}));

describe('HealthService', () => {
  let healthService: HealthService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    healthService = new HealthService();
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('registerCheck', () => {
    it('should register a health check', () => {
      const mockCheck: HealthCheck = {
        name: 'test-check',
        check: jest.fn().mockResolvedValue({ status: 'healthy' }),
      };

      healthService.registerCheck(mockCheck);

      expect(mockLogger.info).toHaveBeenCalledWith('Health check registered: test-check');
    });
  });

  describe('runChecks', () => {
    it('should return healthy status when all checks pass', async () => {
      const mockCheck: HealthCheck = {
        name: 'test-check',
        check: jest.fn().mockResolvedValue({
          status: 'healthy',
          message: 'All good',
        }),
      };

      healthService.registerCheck(mockCheck);

      const result = await healthService.runChecks();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.service).toEqual({
        name: 'test-service',
        version: '1.0.0',
        environment: 'test',
      });
      expect(result.checks['test-check']).toEqual({
        status: 'healthy',
        message: 'All good',
        responseTime: expect.any(Number),
      });
    });

    it('should return degraded status when some checks are degraded', async () => {
      const healthyCheck: HealthCheck = {
        name: 'healthy-check',
        check: jest.fn().mockResolvedValue({ status: 'healthy' }),
      };
      const degradedCheck: HealthCheck = {
        name: 'degraded-check',
        check: jest.fn().mockResolvedValue({ status: 'degraded', message: 'Performance issues' }),
      };

      healthService.registerCheck(healthyCheck);
      healthService.registerCheck(degradedCheck);

      const result = await healthService.runChecks();

      expect(result.status).toBe('degraded');
      expect(result.checks['degraded-check']?.status).toBe('degraded');
    });

    it('should return unhealthy status when any check fails', async () => {
      const healthyCheck: HealthCheck = {
        name: 'healthy-check',
        check: jest.fn().mockResolvedValue({ status: 'healthy' }),
      };
      const unhealthyCheck: HealthCheck = {
        name: 'unhealthy-check',
        check: jest.fn().mockResolvedValue({ status: 'unhealthy', message: 'Service down' }),
      };

      healthService.registerCheck(healthyCheck);
      healthService.registerCheck(unhealthyCheck);

      const result = await healthService.runChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.checks['unhealthy-check']?.status).toBe('unhealthy');
    });

    it('should handle check errors gracefully', async () => {
      const errorCheck: HealthCheck = {
        name: 'error-check',
        check: jest.fn().mockRejectedValue(new Error('Check failed')),
      };

      healthService.registerCheck(errorCheck);

      const result = await healthService.runChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.checks['error-check']).toEqual({
        status: 'unhealthy',
        message: 'Check failed',
        responseTime: 0,
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Health check failed: error-check', expect.any(Error));
    });
  });

  describe('handleHealthCheck', () => {
    it('should return 200 for healthy status', async () => {
      const mockCheck: HealthCheck = {
        name: 'test-check',
        check: jest.fn().mockResolvedValue({ status: 'healthy' }),
      };

      healthService.registerCheck(mockCheck);

      await healthService.handleHealthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'healthy',
      }));
    });

    it('should return 200 for degraded status', async () => {
      const mockCheck: HealthCheck = {
        name: 'test-check',
        check: jest.fn().mockResolvedValue({ status: 'degraded' }),
      };

      healthService.registerCheck(mockCheck);

      await healthService.handleHealthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'degraded',
      }));
    });

    it('should return 503 for unhealthy status', async () => {
      const mockCheck: HealthCheck = {
        name: 'test-check',
        check: jest.fn().mockResolvedValue({ status: 'unhealthy' }),
      };

      healthService.registerCheck(mockCheck);

      await healthService.handleHealthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'unhealthy',
      }));
    });

    it('should handle system errors', async () => {
      jest.spyOn(healthService, 'runChecks').mockRejectedValue(new Error('System error'));

      await healthService.handleHealthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'unhealthy',
        timestamp: expect.any(String),
        message: 'Health check system failure',
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Health check endpoint failed', expect.any(Error));
    });
  });

  describe('handleReadinessCheck', () => {
    it('should return ready for healthy status', async () => {
      const mockCheck: HealthCheck = {
        name: 'test-check',
        check: jest.fn().mockResolvedValue({ status: 'healthy' }),
      };

      healthService.registerCheck(mockCheck);

      await healthService.handleReadinessCheck(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'ready',
        timestamp: expect.any(String),
      });
    });

    it('should return ready for degraded status', async () => {
      const mockCheck: HealthCheck = {
        name: 'test-check',
        check: jest.fn().mockResolvedValue({ status: 'degraded' }),
      };

      healthService.registerCheck(mockCheck);

      await healthService.handleReadinessCheck(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'ready',
        timestamp: expect.any(String),
      });
    });

    it('should return not ready for unhealthy status', async () => {
      const mockCheck: HealthCheck = {
        name: 'test-check',
        check: jest.fn().mockResolvedValue({ status: 'unhealthy' }),
      };

      healthService.registerCheck(mockCheck);

      await healthService.handleReadinessCheck(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'not ready',
        timestamp: expect.any(String),
      });
    });
  });

  describe('handleLivenessCheck', () => {
    it('should always return alive', () => {
      healthService.handleLivenessCheck(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'alive',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });
  });
});

describe('Built-in Health Checks', () => {
  describe('databaseHealthCheck', () => {
    it('should return healthy status', async () => {
      const result = await databaseHealthCheck.check();

      expect(result.status).toBe('healthy');
      expect(result.message).toBe('Database connection successful');
      expect(result.details).toEqual({
        responseTime: expect.any(Number),
        connectionPool: 'active',
      });
    });
  });

  describe('redisHealthCheck', () => {
    it('should return healthy status', async () => {
      const result = await redisHealthCheck.check();

      expect(result.status).toBe('healthy');
      expect(result.message).toBe('Redis connection successful');
      expect(result.details).toEqual({
        responseTime: expect.any(Number),
        connected: true,
      });
    });
  });

  describe('memoryHealthCheck', () => {
    it('should return healthy status for normal memory usage', async () => {
      const result = await memoryHealthCheck.check();

      expect(result.status).toBeOneOf(['healthy', 'degraded', 'unhealthy']);
      expect(result.message).toBeDefined();
      expect(result.details).toEqual({
        heapUsed: expect.any(Number),
        heapTotal: expect.any(Number),
        usagePercent: expect.any(Number),
        external: expect.any(Number),
      });
    });

    it('should handle memory usage calculations correctly', async () => {
      const originalMemoryUsage = process.memoryUsage;
      const mockMemoryUsage = jest.fn().mockReturnValue({
        heapUsed: 80 * 1024 * 1024, // 80 MB
        heapTotal: 100 * 1024 * 1024, // 100 MB
        external: 10 * 1024 * 1024, // 10 MB
        rss: 120 * 1024 * 1024, // 120 MB
        arrayBuffers: 5 * 1024 * 1024, // 5 MB
      });
      process.memoryUsage = mockMemoryUsage;

      const result = await memoryHealthCheck.check();

      expect(result.status).toBe('healthy'); // 80% should be healthy
      expect(result.details?.['usagePercent']).toBe(80);

      process.memoryUsage = originalMemoryUsage;
    });
  });
});

// Custom matcher for Jest
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(items: unknown[]): R;
    }
  }
}

expect.extend({
  toBeOneOf(received, items) {
    const pass = items.includes(received);
    const message = () =>
      pass
        ? `expected ${received} not to be one of ${items.join(', ')}`
        : `expected ${received} to be one of ${items.join(', ')}`;

    return { message, pass };
  },
});