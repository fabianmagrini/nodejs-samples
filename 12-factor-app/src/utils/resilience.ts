import { logger } from './logger';
import { config } from '../config';
import { metricsService } from '../monitoring/metrics';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  threshold: number;
  timeout: number;
  resetTimeout: number;
  name: string;
}

export interface RetryOptions {
  attempts: number;
  delay: number;
  exponentialBackoff?: boolean;
  maxDelay?: number;
  name?: string;
}

export interface TimeoutOptions {
  timeout: number;
  name?: string;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;

  constructor(private options: CircuitBreakerOptions) {}

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        const error = new Error(`Circuit breaker ${this.options.name} is OPEN`);
        metricsService.recordError('circuit_breaker_open', undefined, this.options.name);
        logger.warn(`Circuit breaker ${this.options.name} rejected request - state: OPEN`);
        throw error;
      } else {
        this.state = CircuitBreakerState.HALF_OPEN;
        logger.info(`Circuit breaker ${this.options.name} moving to HALF_OPEN state`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
      logger.info(`Circuit breaker ${this.options.name} moving to CLOSED state`);
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.threshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeout;
      metricsService.recordError('circuit_breaker_opened', undefined, this.options.name);
      logger.warn(`Circuit breaker ${this.options.name} moving to OPEN state after ${this.failureCount} failures`);
    }
  }

  public getState(): CircuitBreakerState {
    return this.state;
  }

  public getStats(): { state: CircuitBreakerState; failureCount: number; lastFailureTime: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

export class RetryService {
  public static async execute<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
    let lastError: Error | undefined;
    let delay = options.delay;

    for (let attempt = 1; attempt <= options.attempts; attempt++) {
      try {
        const result = await fn();
        if (attempt > 1) {
          logger.info(`Retry succeeded on attempt ${attempt}`, {
            operation: options.name || 'unknown',
            attempts: attempt,
          });
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === options.attempts) {
          metricsService.recordError('retry_exhausted', undefined, options.name);
          logger.error(`Retry exhausted after ${attempt} attempts`, lastError, {
            operation: options.name || 'unknown',
            attempts: attempt,
          });
          break;
        }

        logger.warn(`Retry attempt ${attempt} failed, retrying in ${delay}ms`, {
          operation: options.name || 'unknown',
          attempts: attempt,
          error: lastError,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));

        if (options.exponentialBackoff) {
          delay = Math.min(delay * 2, options.maxDelay || delay * 10);
        }
      }
    }

    throw lastError;
  }
}

export class TimeoutService {
  public static async execute<T>(fn: () => Promise<T>, options: TimeoutOptions): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const error = new Error(`Operation timed out after ${options.timeout}ms`);
        metricsService.recordError('timeout', undefined, options.name);
        logger.warn(`Operation timed out`, {
          operation: options.name || 'unknown',
          timeout: options.timeout,
        });
        reject(error);
      }, options.timeout);
    });

    try {
      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        throw error;
      }
      throw error;
    }
  }
}

export class ResilienceService {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  public createCircuitBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    const finalOptions: CircuitBreakerOptions = {
      threshold: options?.threshold || config.resilience.circuitBreaker.threshold,
      timeout: options?.timeout || config.resilience.circuitBreaker.timeout,
      resetTimeout: options?.resetTimeout || config.resilience.circuitBreaker.resetTimeout,
      name,
    };

    const circuitBreaker = new CircuitBreaker(finalOptions);
    this.circuitBreakers.set(name, circuitBreaker);
    
    logger.info(`Circuit breaker created: ${name}`, { options: finalOptions });
    return circuitBreaker;
  }

  public getCircuitBreaker(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  public async executeWithResilience<T>(
    name: string,
    fn: () => Promise<T>,
    options?: {
      circuitBreaker?: Partial<CircuitBreakerOptions> | false;
      retry?: Partial<RetryOptions>;
      timeout?: Partial<TimeoutOptions>;
    }
  ): Promise<T> {
    let circuitBreaker = this.getCircuitBreaker(name);
    if (!circuitBreaker && options?.circuitBreaker !== false) {
      const cbOptions = (typeof options?.circuitBreaker === 'object') ? options.circuitBreaker : undefined;
      circuitBreaker = this.createCircuitBreaker(name, cbOptions);
    }

    const executeWithTimeout = async (): Promise<T> => {
      if (options?.timeout) {
        const timeoutOptions: TimeoutOptions = {
          timeout: options.timeout.timeout || config.resilience.timeout.request,
          name,
        };
        return TimeoutService.execute(fn, timeoutOptions);
      }
      return fn();
    };

    const executeWithCircuitBreaker = async (): Promise<T> => {
      if (circuitBreaker) {
        return circuitBreaker.execute(executeWithTimeout);
      }
      return executeWithTimeout();
    };

    if (options?.retry) {
      const retryOptions: RetryOptions = {
        attempts: options.retry.attempts || config.resilience.retry.attempts,
        delay: options.retry.delay || config.resilience.retry.delay,
        exponentialBackoff: options.retry.exponentialBackoff,
        maxDelay: options.retry.maxDelay,
        name,
      };
      return RetryService.execute(executeWithCircuitBreaker, retryOptions);
    }

    return executeWithCircuitBreaker();
  }

  public getCircuitBreakerStats(): Record<string, { state: CircuitBreakerState; failureCount: number; lastFailureTime: number }> {
    const stats: Record<string, { state: CircuitBreakerState; failureCount: number; lastFailureTime: number }> = {};
    
    for (const [name, cb] of this.circuitBreakers) {
      stats[name] = cb.getStats();
    }
    
    return stats;
  }
}

export const resilienceService = new ResilienceService();