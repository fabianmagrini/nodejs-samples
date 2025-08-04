import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { config } from '../config';

export class TracingService {
  private sdk: NodeSDK | null = null;
  private tracer = trace.getTracer(config.tracing.serviceName);

  public initialize(): void {
    if (!config.tracing.enabled) {
      console.log('Tracing is disabled');
      return;
    }

    this.sdk = new NodeSDK({
      instrumentations: [getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      })],
    });

    this.sdk.start();
    console.log('Tracing initialized successfully');
  }

  public async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      console.log('Tracing shut down successfully');
    }
  }

  public createSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return this.tracer.startActiveSpan(name, async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  public createHttpSpan<T>(name: string, method: string, url: string, fn: () => Promise<T>): Promise<T> {
    return this.tracer.startActiveSpan(name, {
      kind: SpanKind.CLIENT,
      attributes: {
        'http.method': method,
        'http.url': url,
      },
    }, async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  public addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      Object.entries(attributes).forEach(([key, value]) => {
        activeSpan.setAttribute(key, value);
      });
    }
  }

  public addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(name, attributes);
    }
  }

  public getTraceId(): string | undefined {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      return activeSpan.spanContext().traceId;
    }
    return undefined;
  }

  public getSpanId(): string | undefined {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      return activeSpan.spanContext().spanId;
    }
    return undefined;
  }
}

export const tracingService = new TracingService();