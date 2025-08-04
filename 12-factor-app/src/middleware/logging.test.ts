import { Request, Response, NextFunction } from 'express';
import {
  correlationIdMiddleware,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
} from './logging';
import { logger } from '../utils/logger';

jest.mock('../utils/logger');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

describe('Logging Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
    };
    mockResponse = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('correlationIdMiddleware', () => {
    it('should generate new correlation ID and request ID', () => {
      correlationIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).correlationId).toBe('mock-uuid-123');
      expect((mockRequest as any).requestId).toBe('mock-uuid-123');
      expect((mockRequest as any).startTime).toBeGreaterThan(0);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('x-correlation-id', 'mock-uuid-123');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('x-request-id', 'mock-uuid-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing correlation ID from headers', () => {
      const existingCorrelationId = 'existing-correlation-id';
      mockRequest.headers = { 'x-correlation-id': existingCorrelationId };

      correlationIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).correlationId).toBe(existingCorrelationId);
      expect((mockRequest as any).requestId).toBe('mock-uuid-123');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('x-correlation-id', existingCorrelationId);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('x-request-id', 'mock-uuid-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set start time for request timing', () => {
      const startTime = Date.now();
      
      correlationIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).startTime).toBeGreaterThanOrEqual(startTime);
      expect((mockRequest as any).startTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('requestLoggingMiddleware', () => {
    beforeEach(() => {
      // Set up request with correlation data (simulating correlationIdMiddleware run first)
      (mockRequest as any).correlationId = 'test-correlation-id';
      (mockRequest as any).requestId = 'test-request-id';
      (mockRequest as any).startTime = Date.now() - 100; // 100ms ago
    });

    it('should log incoming request', () => {
      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.logRequest).toHaveBeenCalledWith(mockRequest, {
        correlationId: 'test-correlation-id',
        requestId: 'test-request-id',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should intercept response and log it', () => {
      const originalSend = jest.fn();
      mockResponse.send = originalSend;

      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate sending response
      const responseBody = { message: 'success' };
      (mockResponse.send as jest.Mock)(responseBody);

      expect(mockLogger.logResponse).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        expect.any(Number), // duration
        {
          correlationId: 'test-correlation-id',
          requestId: 'test-request-id',
        }
      );
      expect(originalSend).toHaveBeenCalledWith(responseBody);
    });

    it('should calculate request duration correctly', () => {
      const startTime = Date.now() - 150; // 150ms ago
      (mockRequest as any).startTime = startTime;
      
      const originalSend = jest.fn();
      mockResponse.send = originalSend;

      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate sending response
      (mockResponse.send as jest.Mock)('test response');

      expect(mockLogger.logResponse).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        expect.any(Number),
        expect.any(Object)
      );

      // Get the duration that was passed to logResponse
      const logResponseCall = mockLogger.logResponse.mock.calls[0];
      const duration = logResponseCall[2];
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThanOrEqual(Date.now() - startTime + 10); // Allow 10ms tolerance
    });

    it('should preserve original response behavior', () => {
      const originalSend = jest.fn().mockReturnValue('mock return value');
      mockResponse.send = originalSend;

      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      const responseBody = { data: 'test' };
      const result = (mockResponse.send as jest.Mock)(responseBody);

      expect(result).toBe('mock return value');
      expect(originalSend).toHaveBeenCalledWith(responseBody);
    });
  });

  describe('errorLoggingMiddleware', () => {
    beforeEach(() => {
      // Set up request with correlation data
      (mockRequest as any).correlationId = 'test-correlation-id';
      (mockRequest as any).requestId = 'test-request-id';
      mockRequest.headers = { 'user-agent': 'test-user-agent' };
    });

    it('should log error with request context', () => {
      const error = new Error('Test error');

      errorLoggingMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.logError).toHaveBeenCalledWith(error, {
        correlationId: 'test-correlation-id',
        requestId: 'test-request-id',
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
        userAgent: 'test-user-agent',
      });
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle missing user-agent header', () => {
      const error = new Error('Test error');
      mockRequest.headers = {}; // No user-agent

      errorLoggingMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.logError).toHaveBeenCalledWith(error, {
        correlationId: 'test-correlation-id',
        requestId: 'test-request-id',
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
        userAgent: undefined,
      });
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should pass error to next middleware', () => {
      const error = new Error('Test error');

      errorLoggingMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle different error types', () => {
      const errors = [
        new Error('Standard error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
      ];

      errors.forEach((error) => {
        mockNext.mockClear();
        mockLogger.logError.mockClear();

        errorLoggingMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockLogger.logError).toHaveBeenCalledWith(error, expect.any(Object));
        expect(mockNext).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('middleware integration', () => {
    it('should work together in sequence', () => {
      // First, run correlation ID middleware
      correlationIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      mockNext.mockClear();

      // Then, run request logging middleware
      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockLogger.logRequest).toHaveBeenCalled();

      // Simulate error occurring and run error logging middleware
      const error = new Error('Test error');
      errorLoggingMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockLogger.logError).toHaveBeenCalledWith(error, expect.objectContaining({
        correlationId: expect.any(String),
        requestId: expect.any(String),
      }));
    });

    it('should maintain correlation context across middleware', () => {
      // Set up correlation ID
      correlationIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      const correlationId = (mockRequest as any).correlationId;
      const requestId = (mockRequest as any).requestId;

      mockNext.mockClear();

      // Log request
      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockLogger.logRequest).toHaveBeenCalledWith(mockRequest, {
        correlationId,
        requestId,
      });

      // Log error
      const error = new Error('Test error');
      errorLoggingMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockLogger.logError).toHaveBeenCalledWith(error, expect.objectContaining({
        correlationId,
        requestId,
      }));
    });
  });

  describe('edge cases', () => {
    it('should handle missing correlation data gracefully', () => {
      // Don't run correlationIdMiddleware first
      const error = new Error('Test error');

      errorLoggingMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.logError).toHaveBeenCalledWith(error, {
        correlationId: undefined,
        requestId: undefined,
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
        userAgent: undefined,
      });
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle response send being called multiple times', () => {
      (mockRequest as any).correlationId = 'test-correlation-id';
      (mockRequest as any).requestId = 'test-request-id';
      (mockRequest as any).startTime = Date.now();

      const originalSend = jest.fn().mockReturnValue('response');
      mockResponse.send = originalSend;

      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Call send multiple times
      (mockResponse.send as jest.Mock)('first response');
      (mockResponse.send as jest.Mock)('second response');

      expect(mockLogger.logResponse).toHaveBeenCalledTimes(2);
      expect(originalSend).toHaveBeenCalledTimes(2);
    });
  });
});