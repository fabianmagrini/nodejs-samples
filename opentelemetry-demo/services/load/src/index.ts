import axios from 'axios';

const GENERATOR_URL = process.env.GENERATOR_URL || 'http://localhost:5050';
const LOAD_DELAY_MS = parseInt(process.env.LOAD_DELAY_MS || '500', 10);
const MAX_BACKOFF_MS = 30000;

interface GeneratorResponse {
  password: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestPassword(): Promise<void> {
  const startTime = Date.now();
  try {
    const response = await axios.get<GeneratorResponse>(
      `${GENERATOR_URL}/generate`,
      { timeout: 10000 }
    );
    const elapsed = Date.now() - startTime;
    const { password } = response.data;
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'password_generated',
        password,
        response_time_ms: elapsed,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'request_failed',
        error: String(err),
        response_time_ms: elapsed,
        timestamp: new Date().toISOString(),
      })
    );
    throw err;
  }
}

async function waitForGenerator(): Promise<void> {
  let backoff = 1000;
  console.log(`Waiting for generator service at ${GENERATOR_URL}...`);
  while (true) {
    try {
      await axios.get(`${GENERATOR_URL}/health`, { timeout: 5000 });
      console.log('Generator service is ready.');
      return;
    } catch {
      console.log(`Generator not ready, retrying in ${backoff}ms...`);
      await sleep(backoff);
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    }
  }
}

async function runLoadLoop(): Promise<void> {
  await waitForGenerator();

  let consecutiveErrors = 0;
  let backoff = LOAD_DELAY_MS;

  console.log(
    JSON.stringify({
      level: 'info',
      event: 'load_started',
      generator_url: GENERATOR_URL,
      delay_ms: LOAD_DELAY_MS,
      timestamp: new Date().toISOString(),
    })
  );

  while (true) {
    try {
      await requestPassword();
      consecutiveErrors = 0;
      backoff = LOAD_DELAY_MS;
    } catch {
      consecutiveErrors++;
      // Exponential backoff on consecutive errors, capped at MAX_BACKOFF_MS
      backoff = Math.min(LOAD_DELAY_MS * Math.pow(2, consecutiveErrors), MAX_BACKOFF_MS);
      console.error(
        JSON.stringify({
          level: 'warn',
          event: 'backoff',
          consecutive_errors: consecutiveErrors,
          next_retry_ms: backoff,
          timestamp: new Date().toISOString(),
        })
      );
    }

    await sleep(backoff);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Load service received SIGTERM, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Load service received SIGINT, shutting down...');
  process.exit(0);
});

runLoadLoop().catch((err) => {
  console.error('Fatal error in load loop:', err);
  process.exit(1);
});
