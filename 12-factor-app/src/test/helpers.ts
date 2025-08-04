import request from 'supertest';
import { Application } from 'express';

export class TestHelper {
  constructor(private app: Application) {}

  public async healthCheck(): Promise<request.Response> {
    return request(this.app).get('/health');
  }

  public async metricsCheck(): Promise<request.Response> {
    return request(this.app).get('/metrics');
  }

  public async readinessCheck(): Promise<request.Response> {
    return request(this.app).get('/ready');
  }

  public async livenessCheck(): Promise<request.Response> {
    return request(this.app).get('/live');
  }

  public async makeRequest(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<request.Response> {
    let req = request(this.app)[method](path);
    
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }
    
    if (body) {
      req = req.send(body);
    }
    
    return req;
  }

  public async simulateLoad(
    endpoint: string,
    requests: number,
    concurrency: number = 10
  ): Promise<request.Response[]> {
    const chunks = [];
    for (let i = 0; i < requests; i += concurrency) {
      chunks.push(Array.from({ length: Math.min(concurrency, requests - i) }));
    }

    const results: request.Response[] = [];
    for (const chunk of chunks) {
      const promises = chunk.map(() => request(this.app).get(endpoint));
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }

    return results;
  }
}

export const createMockError = (message: string, statusCode: number = 500): Error => {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
};

export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};