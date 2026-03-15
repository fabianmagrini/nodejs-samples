// tracing must be initialized before any other imports
import { initTracing } from './tracing';
const sdk = initTracing('generator-service');

import express, { Request, Response } from 'express';
import axios from 'axios';
import { trace, SpanStatusCode, context, SpanKind } from '@opentelemetry/api';

const app = express();
const PORT = parseInt(process.env.PORT || '5050', 10);
const tracer = trace.getTracer('generator-service');

const LOWER_URL = process.env.LOWER_SERVICE_URL || 'http://localhost:5053';
const UPPER_URL = process.env.UPPER_SERVICE_URL || 'http://localhost:5054';
const DIGIT_URL = process.env.DIGIT_SERVICE_URL || 'http://localhost:5051';
const SPECIAL_URL = process.env.SPECIAL_SERVICE_URL || 'http://localhost:5052';

interface CharResponse {
  char: string;
}

/**
 * Fetch n characters from a given service URL.
 * Each call is traced as a child span of the parent span in ctx.
 */
async function fetchChars(
  serviceUrl: string,
  count: number,
  spanName: string,
  ctx: ReturnType<typeof context.active>
): Promise<string[]> {
  const chars: string[] = [];
  for (let i = 0; i < count; i++) {
    const childSpan = tracer.startSpan(
      spanName,
      { kind: SpanKind.CLIENT },
      ctx
    );
    try {
      const response = await axios.get<CharResponse>(serviceUrl, {
        timeout: 5000,
      });
      const char = response.data.char;
      childSpan.setAttribute('service.url', serviceUrl);
      childSpan.setAttribute('generated.char', char);
      childSpan.setStatus({ code: SpanStatusCode.OK });
      chars.push(char);
    } catch (err) {
      childSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: String(err),
      });
      throw err;
    } finally {
      childSpan.end();
    }
  }
  return chars;
}

/**
 * Fisher-Yates shuffle for an array.
 */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'generator' });
});

app.get('/generate', async (req: Request, res: Response) => {
  const lower = Math.max(0, parseInt(String(req.query.lower ?? '3'), 10));
  const upper = Math.max(0, parseInt(String(req.query.upper ?? '3'), 10));
  const digit = Math.max(0, parseInt(String(req.query.digit ?? '3'), 10));
  const special = Math.max(0, parseInt(String(req.query.special ?? '3'), 10));
  const totalLength =
    parseInt(String(req.query.length ?? String(lower + upper + digit + special)), 10);

  const parentSpan = tracer.startSpan('generate-password', {
    kind: SpanKind.SERVER,
  });
  const ctx = trace.setSpan(context.active(), parentSpan);

  parentSpan.setAttribute('password.lower_count', lower);
  parentSpan.setAttribute('password.upper_count', upper);
  parentSpan.setAttribute('password.digit_count', digit);
  parentSpan.setAttribute('password.special_count', special);
  parentSpan.setAttribute('password.total_length', totalLength);

  try {
    // Make concurrent calls to all character services
    const [lowerChars, upperChars, digitChars, specialChars] =
      await Promise.all([
        fetchChars(LOWER_URL, lower, 'fetch-lower-char', ctx),
        fetchChars(UPPER_URL, upper, 'fetch-upper-char', ctx),
        fetchChars(DIGIT_URL, digit, 'fetch-digit-char', ctx),
        fetchChars(SPECIAL_URL, special, 'fetch-special-char', ctx),
      ]);

    // Combine all characters and shuffle to produce the password
    const allChars = shuffle([
      ...lowerChars,
      ...upperChars,
      ...digitChars,
      ...specialChars,
    ]);

    // Trim or pad to requested total length if it differs from sum
    const password = allChars.slice(0, totalLength).join('');

    parentSpan.setAttribute('password.length', password.length);
    parentSpan.setStatus({ code: SpanStatusCode.OK });
    res.json({ password });
  } catch (error) {
    parentSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
    res.status(500).json({ error: 'Failed to generate password', details: String(error) });
  } finally {
    parentSpan.end();
  }
});

const server = app.listen(PORT, () => {
  console.log(`Generator service listening on port ${PORT}`);
});

export { server };
export default app;
