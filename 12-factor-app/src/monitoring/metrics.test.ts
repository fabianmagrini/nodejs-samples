import { Request, Response } from 'express';
import promClient from 'prom-client';
import { MetricsService } from './metrics';
import { config } from '../config';

jest.mock('../config', () => ({
  config: {
    tracing: {
      serviceName: 'test-service',
    },
  },
}));

describe('MetricsService', () => {
  let metricsService: MetricsService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Clear all metrics before each test
    promClient.register.clear();
    metricsService = new MetricsService();
    
    mockRequest = {};
    mockResponse = {
      set: jest.fn(),
      end: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    promClient.register.clear();
  });

  describe('constructor', () => {
    it('should initialize metrics with sanitized service name', () => {
      expect(metricsService.httpRequestDuration).toBeDefined();
      expect(metricsService.httpRequestTotal).toBeDefined();
      expect(metricsService.httpRequestSize).toBeDefined();
      expect(metricsService.httpResponseSize).toBeDefined();
      expect(metricsService.activeConnections).toBeDefined();
      expect(metricsService.errorTotal).toBeDefined();
      expect(metricsService.businessMetrics).toBeDefined();
    });

    it('should register default metrics with correct prefix', async () => {
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('test_service_');
    });
  });

  describe('recordHttpRequest', () => {
    it('should record HTTP request metrics', () => {
      const method = 'GET';
      const route = '/api/users';
      const statusCode = 200;
      const duration = 150;
      const requestSize = 100;
      const responseSize = 500;

      metricsService.recordHttpRequest(method, route, statusCode, duration, requestSize, responseSize);

      // Verify metrics were recorded by getting the metric values
      const durationMetric = metricsService.httpRequestDuration;
      const totalMetric = metricsService.httpRequestTotal;
      const requestSizeMetric = metricsService.httpRequestSize;
      const responseSizeMetric = metricsService.httpResponseSize;

      expect(durationMetric).toBeDefined();
      expect(totalMetric).toBeDefined();
      expect(requestSizeMetric).toBeDefined();
      expect(responseSizeMetric).toBeDefined();
    });

    it('should record HTTP request metrics without optional sizes', () => {
      const method = 'POST';
      const route = '/api/users';
      const statusCode = 201;
      const duration = 200;

      expect(() => {
        metricsService.recordHttpRequest(method, route, statusCode, duration);
      }).not.toThrow();
    });

    it('should handle different status codes', () => {
      const testCases = [
        { method: 'GET', route: '/api/users', statusCode: 200, duration: 100 },
        { method: 'POST', route: '/api/users', statusCode: 201, duration: 150 },
        { method: 'GET', route: '/api/users/123', statusCode: 404, duration: 50 },
        { method: 'POST', route: '/api/users', statusCode: 500, duration: 300 },
      ];

      testCases.forEach(({ method, route, statusCode, duration }) => {
        expect(() => {
          metricsService.recordHttpRequest(method, route, statusCode, duration);
        }).not.toThrow();
      });
    });
  });

  describe('recordError', () => {
    it('should record error metrics with all parameters', () => {
      const type = 'validation_error';
      const method = 'POST';
      const route = '/api/users';

      expect(() => {
        metricsService.recordError(type, method, route);
      }).not.toThrow();
    });

    it('should record error metrics with minimal parameters', () => {
      const type = 'database_error';

      expect(() => {
        metricsService.recordError(type);
      }).not.toThrow();
    });

    it('should handle undefined method and route', () => {
      const type = 'unknown_error';

      expect(() => {
        metricsService.recordError(type, undefined, undefined);
      }).not.toThrow();
    });
  });

  describe('recordBusinessEvent', () => {
    it('should record successful business events', () => {
      const eventType = 'user_created';
      const status = 'success';

      expect(() => {
        metricsService.recordBusinessEvent(eventType, status);
      }).not.toThrow();
    });

    it('should record failed business events', () => {
      const eventType = 'user_updated';
      const status = 'failure';

      expect(() => {
        metricsService.recordBusinessEvent(eventType, status);
      }).not.toThrow();
    });

    it('should handle multiple business events', () => {
      const events = [
        { eventType: 'user_created', status: 'success' as const },
        { eventType: 'user_updated', status: 'success' as const },
        { eventType: 'user_deleted', status: 'failure' as const },
      ];

      events.forEach(({ eventType, status }) => {
        expect(() => {
          metricsService.recordBusinessEvent(eventType, status);
        }).not.toThrow();
      });
    });
  });

  describe('connection tracking', () => {
    it('should increment active connections', () => {
      expect(() => {
        metricsService.incrementActiveConnections();
      }).not.toThrow();
    });

    it('should decrement active connections', () => {
      expect(() => {
        metricsService.decrementActiveConnections();
      }).not.toThrow();
    });

    it('should handle multiple connection changes', () => {
      expect(() => {
        metricsService.incrementActiveConnections();
        metricsService.incrementActiveConnections();
        metricsService.decrementActiveConnections();
      }).not.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should return metrics as string', async () => {
      // Record some metrics first
      metricsService.recordHttpRequest('GET', '/api/users', 200, 100);
      metricsService.recordError('test_error');
      metricsService.recordBusinessEvent('test_event', 'success');

      const metrics = await metricsService.getMetrics();

      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('test_service_');
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should include default metrics', async () => {
      const metrics = await metricsService.getMetrics();

      // Check for some default Node.js metrics
      expect(metrics).toContain('process_');
      expect(metrics).toContain('nodejs_');
    });
  });

  describe('handleMetricsEndpoint', () => {
    it('should handle metrics endpoint successfully', async () => {
      await metricsService.handleMetricsEndpoint(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledWith('Content-Type', expect.any(String));
      expect(mockResponse.end).toHaveBeenCalledWith(expect.any(String));
    });

    it('should handle metrics endpoint errors', async () => {
      // Mock getMetrics to throw an error
      jest.spyOn(metricsService, 'getMetrics').mockRejectedValue(new Error('Metrics error'));

      await metricsService.handleMetricsEndpoint(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to generate metrics' });
    });
  });

  describe('getRegistry', () => {
    it('should return the registry instance', () => {
      const registry = metricsService.getRegistry();
      expect(registry).toBeInstanceOf(promClient.Registry);
    });

    it('should return the same registry instance', () => {
      const registry1 = metricsService.getRegistry();
      const registry2 = metricsService.getRegistry();
      expect(registry1).toBe(registry2);
    });
  });

  describe('metric naming with service name sanitization', () => {
    it('should sanitize service name in metric names', async () => {
      // Create a new service with a hyphenated name
      const originalConfig = { ...config };
      (config as any).tracing.serviceName = 'my-test-service';
      
      const serviceWithHyphens = new MetricsService();
      serviceWithHyphens.recordHttpRequest('GET', '/test', 200, 100);
      
      const metrics = await serviceWithHyphens.getMetrics();
      
      // Should contain underscores instead of hyphens
      expect(metrics).toContain('my_test_service_');
      expect(metrics).not.toContain('my-test-service_');
      
      // Restore original config
      Object.assign(config, originalConfig);
    });
  });

  describe('integration with prometheus client', () => {
    it('should work with prometheus histogram buckets', () => {
      const durations = [0.05, 0.5, 1.5, 5.5, 12];
      
      durations.forEach((duration) => {
        metricsService.recordHttpRequest('GET', '/test', 200, duration * 1000);
      });

      expect(() => {
        metricsService.httpRequestDuration.get();
      }).not.toThrow();
    });

    it('should work with prometheus counter operations', () => {
      for (let i = 0; i < 10; i++) {
        metricsService.recordHttpRequest('GET', '/test', 200, 100);
        metricsService.recordError('test_error');
        metricsService.recordBusinessEvent('test_event', 'success');
      }

      expect(() => {
        metricsService.httpRequestTotal.get();
        metricsService.errorTotal.get();
        metricsService.businessMetrics.get();
      }).not.toThrow();
    });

    it('should work with prometheus gauge operations', () => {
      // Test gauge increment/decrement
      for (let i = 0; i < 5; i++) {
        metricsService.incrementActiveConnections();
      }
      
      for (let i = 0; i < 3; i++) {
        metricsService.decrementActiveConnections();
      }

      expect(() => {
        metricsService.activeConnections.get();
      }).not.toThrow();
    });
  });
});