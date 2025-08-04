import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from './error';
import { logger } from '../utils/logger';
import { metricsService } from '../monitoring/metrics';

jest.mock('../utils/logger');
jest.mock('../monitoring/metrics');

describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockMetricsService = metricsService as jest.Mocked<typeof metricsService>;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      path: '/api/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
      route: {
        path: '/api/test',
      },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset NODE_ENV
    delete process.env.NODE_ENV;
  });

  describe('errorHandler', () => {
    it('should handle errors with status code', () => {
      const error = new Error('Test error') as any;
      error.statusCode = 400;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockMetricsService.recordError).toHaveBeenCalledWith('application_error', 'GET', '/api/test');
      expect(mockLogger.error).toHaveBeenCalledWith('Application error', error, {
        method: 'GET',
        url: '/api/test',
        statusCode: 400,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Client Error',
        message: 'Test error',
        statusCode: 400,
        timestamp: expect.any(String),
        path: '/api/test',
        stack: expect.any(String),
      });
    });

    it('should default to 500 status code for errors without status', () => {
      const error = new Error('Server error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Server error',
        statusCode: 500,
        timestamp: expect.any(String),
        path: '/api/test',
        stack: expect.any(String),
      });
    });

    it('should handle errors without message', () => {
      const error = new Error() as any;
      error.statusCode = 400;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'An unexpected error occurred',
      }));
    });

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        stack: expect.any(String),
      }));
    });

    it('should exclude stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall).not.toHaveProperty('stack');
    });

    it('should handle different status codes correctly', () => {
      const testCases = [
        { statusCode: 400, expectedError: 'Client Error' },
        { statusCode: 401, expectedError: 'Client Error' },
        { statusCode: 404, expectedError: 'Client Error' },
        { statusCode: 500, expectedError: 'Internal Server Error' },
        { statusCode: 502, expectedError: 'Internal Server Error' },
      ];

      testCases.forEach(({ statusCode, expectedError }) => {
        const error = new Error('Test error') as any;
        error.statusCode = statusCode;

        // Clear previous calls
        (mockResponse.json as jest.Mock).mockClear();

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
          error: expectedError,
          statusCode,
        }));
      });
    });

    it('should handle missing route information', () => {
      const error = new Error('Test error');
      mockRequest.route = undefined;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockMetricsService.recordError).toHaveBeenCalledWith('application_error', 'GET', undefined);
      expect(mockLogger.error).toHaveBeenCalledWith('Application error', error, expect.any(Object));
    });

    it('should handle missing user-agent header', () => {
      const error = new Error('Test error');
      mockRequest.headers = {};

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Application error', error, expect.objectContaining({
        userAgent: undefined,
      }));
    });

    it('should include timestamp in ISO format', () => {
      const error = new Error('Test error');
      const beforeTime = new Date().toISOString();

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const timestamp = responseCall.timestamp;
      
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
    });

    it('should handle operational vs non-operational errors', () => {
      const operationalError = new Error('Operational error') as any;
      operationalError.isOperational = true;
      operationalError.statusCode = 400;

      errorHandler(operationalError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Operational error',
      }));
    });
  });

  describe('notFoundHandler', () => {
    it('should handle 404 not found requests', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockMetricsService.recordError).toHaveBeenCalledWith('not_found', 'GET', '/api/test');
      expect(mockLogger.warn).toHaveBeenCalledWith('Route not found', {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Route GET /api/test not found',
        statusCode: 404,
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('should handle different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach(method => {
        mockRequest.method = method;
        (mockResponse.json as jest.Mock).mockClear();

        notFoundHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
          message: `Route ${method} /api/test not found`,
        }));
      });
    });

    it('should include timestamp in ISO format', () => {
      const beforeTime = new Date().toISOString();

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const timestamp = responseCall.timestamp;
      
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
    });

    it('should handle missing IP address', () => {
      mockRequest.ip = undefined;

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockLogger.warn).toHaveBeenCalledWith('Route not found', {
        method: 'GET',
        url: '/api/test',
        ip: undefined,
      });
    });

    it('should handle different URL patterns', () => {
      const urls = [
        '/api/users',
        '/api/users/123',
        '/health',
        '/metrics',
        '/non-existent-route',
      ];

      urls.forEach(url => {
        mockRequest.url = url;
        mockRequest.path = url;
        (mockResponse.json as jest.Mock).mockClear();

        notFoundHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
          message: `Route GET ${url} not found`,
          path: url,
        }));
      });
    });
  });

  describe('error middleware integration', () => {
    it('should work with logging middleware context', () => {
      const error = new Error('Test error') as any;
      error.statusCode = 400;

      // Simulate logging middleware adding correlation data
      (mockRequest as any).correlationId = 'test-correlation-id';
      (mockRequest as any).requestId = 'test-request-id';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Application error', error, expect.objectContaining({
        method: 'GET',
        url: '/api/test',
        statusCode: 400,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      }));
    });

    it('should handle error response format consistently', () => {
      const error = new Error('Validation failed') as any;
      error.statusCode = 422;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      
      expect(responseCall).toHaveProperty('error');
      expect(responseCall).toHaveProperty('message');
      expect(responseCall).toHaveProperty('statusCode');
      expect(responseCall).toHaveProperty('timestamp');
      expect(responseCall).toHaveProperty('path');
    });
  });

  describe('edge cases', () => {
    it('should handle null error', () => {
      const error = null as any;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'An unexpected error occurred',
      }));
    });

    it('should handle error with non-string message', () => {
      const error = new Error() as any;
      error.message = 123; // Non-string message

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: '123',
      }));
    });

    it('should handle error with zero status code', () => {
      const error = new Error('Test error') as any;
      error.statusCode = 0;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});