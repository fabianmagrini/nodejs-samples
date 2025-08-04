import { CircuitBreaker, CircuitBreakerState, RetryService, TimeoutService } from './resilience';
import { delay } from '../test/helpers';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      name: 'test-circuit',
      threshold: 3,
      timeout: 1000,
      resetTimeout: 2000,
    });
  });

  it('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should open after threshold failures', async () => {
    const failingFunction = jest.fn().mockRejectedValue(new Error('Test error'));

    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingFunction);
      } catch (error) {
        // Expected to fail
      }
    }

    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
  });

  it('should reject calls when OPEN', async () => {
    const failingFunction = jest.fn().mockRejectedValue(new Error('Test error'));

    // Trip the circuit breaker
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingFunction);
      } catch (error) {
        // Expected to fail
      }
    }

    // Should reject without calling the function
    await expect(circuitBreaker.execute(failingFunction)).rejects.toThrow('Circuit breaker test-circuit is OPEN');
    expect(failingFunction).toHaveBeenCalledTimes(3); // Not called for the rejected request
  });

  it('should reset failure count on success', async () => {
    const mockFunction = jest.fn()
      .mockRejectedValueOnce(new Error('Test error'))
      .mockRejectedValueOnce(new Error('Test error'))
      .mockResolvedValueOnce('success');

    // Two failures
    for (let i = 0; i < 2; i++) {
      try {
        await circuitBreaker.execute(mockFunction);
      } catch (error) {
        // Expected to fail
      }
    }

    // One success - should reset failure count
    const result = await circuitBreaker.execute(mockFunction);
    expect(result).toBe('success');
    expect(circuitBreaker.getStats().failureCount).toBe(0);
  });
});

describe('RetryService', () => {
  it('should retry on failure', async () => {
    const mockFunction = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce('success');

    const result = await RetryService.execute(mockFunction, {
      attempts: 3,
      delay: 10,
      name: 'test-retry',
    });

    expect(result).toBe('success');
    expect(mockFunction).toHaveBeenCalledTimes(3);
  });

  it('should fail after exhausting retries', async () => {
    const mockFunction = jest.fn().mockRejectedValue(new Error('Persistent error'));

    await expect(
      RetryService.execute(mockFunction, {
        attempts: 2,
        delay: 10,
        name: 'test-retry',
      })
    ).rejects.toThrow('Persistent error');

    expect(mockFunction).toHaveBeenCalledTimes(2);
  });

  it('should use exponential backoff', async () => {
    const mockFunction = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce('success');

    const startTime = Date.now();
    await RetryService.execute(mockFunction, {
      attempts: 2,
      delay: 100,
      exponentialBackoff: true,
      name: 'test-retry',
    });
    const endTime = Date.now();

    expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    expect(mockFunction).toHaveBeenCalledTimes(2);
  });
});

describe('TimeoutService', () => {
  it('should resolve if function completes within timeout', async () => {
    const mockFunction = jest.fn().mockResolvedValue('success');

    const result = await TimeoutService.execute(mockFunction, {
      timeout: 1000,
      name: 'test-timeout',
    });

    expect(result).toBe('success');
    expect(mockFunction).toHaveBeenCalledTimes(1);
  });

  it('should timeout if function takes too long', async () => {
    const mockFunction = jest.fn().mockImplementation(async () => {
      await delay(200);
      return 'success';
    });

    await expect(
      TimeoutService.execute(mockFunction, {
        timeout: 100,
        name: 'test-timeout',
      })
    ).rejects.toThrow('Operation timed out after 100ms');
  });
});