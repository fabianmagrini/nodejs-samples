// tracing must be initialized before any other imports
import { initTracing } from './tracing';
const sdk = initTracing('special-service');

import express, { Request, Response } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const app = express();
const PORT = parseInt(process.env.PORT || '5052', 10);
const tracer = trace.getTracer('special-service');

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'special' });
});

app.get('/', (_req: Request, res: Response) => {
  const span = tracer.startSpan('generate-special-char');
  try {
    const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const char = chars[Math.floor(Math.random() * chars.length)];
    span.setAttribute('generated.char', char);
    span.setAttribute('char.type', 'special');
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
  console.log(`Special service listening on port ${PORT}`);
});

export { server };
export default app;
