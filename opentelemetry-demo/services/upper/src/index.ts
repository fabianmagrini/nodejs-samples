// tracing must be initialized before any other imports
import { initTracing } from './tracing';
const sdk = initTracing('upper-service');

import express, { Request, Response } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const app = express();
const PORT = parseInt(process.env.PORT || '5054', 10);
const tracer = trace.getTracer('upper-service');

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'upper' });
});

app.get('/', (_req: Request, res: Response) => {
  const span = tracer.startSpan('generate-upper-char');
  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const char = chars[Math.floor(Math.random() * chars.length)];
    span.setAttribute('generated.char', char);
    span.setAttribute('char.type', 'uppercase');
    span.setStatus({ code: SpanStatusCode.OK });
    res.json({ char });
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
    res.status(500).json({ error: 'Failed to generate character' });
  } finally {
    span.end();
  }
});

const server = app.listen(PORT, () => {
  console.log(`Upper service listening on port ${PORT}`);
});

export { server };
export default app;
