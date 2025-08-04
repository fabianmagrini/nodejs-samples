import promClient from 'prom-client';
import { Request, Response } from 'express';
import { config } from '../config';

export class MetricsService {
  private registry: promClient.Registry;

  public readonly httpRequestDuration: promClient.Histogram<string>;
  public readonly httpRequestTotal: promClient.Counter<string>;
  public readonly httpRequestSize: promClient.Histogram<string>;
  public readonly httpResponseSize: promClient.Histogram<string>;
  public readonly activeConnections: promClient.Gauge<string>;
  public readonly errorTotal: promClient.Counter<string>;
  public readonly businessMetrics: promClient.Counter<string>;

  constructor() {
    this.registry = new promClient.Registry();
    
    const sanitizedServiceName = config.tracing.serviceName.replace(/-/g, '_');
    
    promClient.collectDefaultMetrics({
      register: this.registry,
      prefix: `${sanitizedServiceName}_`,
    });

    this.httpRequestDuration = new promClient.Histogram({
      name: `${sanitizedServiceName}_http_request_duration_seconds`,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.registry],
    });

    this.httpRequestTotal = new promClient.Counter({
      name: `${sanitizedServiceName}_http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestSize = new promClient.Histogram({
      name: `${sanitizedServiceName}_http_request_size_bytes`,
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry],
    });

    this.httpResponseSize = new promClient.Histogram({
      name: `${sanitizedServiceName}_http_response_size_bytes`,
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry],
    });

    this.activeConnections = new promClient.Gauge({
      name: `${sanitizedServiceName}_active_connections`,
      help: 'Number of active connections',
      registers: [this.registry],
    });

    this.errorTotal = new promClient.Counter({
      name: `${sanitizedServiceName}_errors_total`,
      help: 'Total number of errors',
      labelNames: ['type', 'method', 'route'],
      registers: [this.registry],
    });

    this.businessMetrics = new promClient.Counter({
      name: `${sanitizedServiceName}_business_events_total`,
      help: 'Total number of business events',
      labelNames: ['event_type', 'status'],
      registers: [this.registry],
    });
  }

  public recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    requestSize?: number,
    responseSize?: number
  ): void {
    const labels = { method, route, status_code: statusCode.toString() };
    
    this.httpRequestDuration.observe(labels, duration / 1000);
    this.httpRequestTotal.inc(labels);
    
    if (requestSize !== undefined) {
      this.httpRequestSize.observe({ method, route }, requestSize);
    }
    
    if (responseSize !== undefined) {
      this.httpResponseSize.observe(labels, responseSize);
    }
  }

  public recordError(type: string, method?: string, route?: string): void {
    this.errorTotal.inc({ type, method: method || 'unknown', route: route || 'unknown' });
  }

  public recordBusinessEvent(eventType: string, status: 'success' | 'failure'): void {
    this.businessMetrics.inc({ event_type: eventType, status });
  }

  public incrementActiveConnections(): void {
    this.activeConnections.inc();
  }

  public decrementActiveConnections(): void {
    this.activeConnections.dec();
  }

  public async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  public async handleMetricsEndpoint(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.getMetrics();
      res.set('Content-Type', this.registry.contentType);
      res.end(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate metrics' });
    }
  }

  public getRegistry(): promClient.Registry {
    return this.registry;
  }
}

export const metricsService = new MetricsService();