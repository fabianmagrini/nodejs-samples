import { logger, LogContext } from './logger';

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log info messages', () => {
    logger.info('Test message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should log with context', () => {
    const context: LogContext = {
      correlationId: 'test-correlation-id',
      userId: 'test-user',
    };

    logger.info('Test message with context', context);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should log errors with stack trace', () => {
    const error = new Error('Test error');
    logger.error('Test error message', error);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should log HTTP requests', () => {
    const req = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
        'content-type': 'application/json',
      },
    };

    logger.logRequest(req);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should log HTTP responses', () => {
    const req = { method: 'GET', url: '/test' };
    const res = { statusCode: 200 };
    const duration = 150;

    logger.logResponse(req, res, duration);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should create child logger with default context', () => {
    const defaultContext: LogContext = {
      correlationId: 'test-correlation-id',
    };

    const childLogger = logger.createChildLogger(defaultContext);
    childLogger.info('Child logger test');
    expect(consoleSpy).toHaveBeenCalled();
  });
});