import * as dotenv from 'dotenv';
import * as Joi from 'joi';

dotenv.config();

interface Config {
  app: {
    name: string;
    version: string;
    env: string;
    port: number;
    host: string;
  };
  logging: {
    level: string;
    format: string;
  };
  tracing: {
    serviceName: string;
    jaegerEndpoint: string;
    enabled: boolean;
  };
  monitoring: {
    metricsPath: string;
    healthPath: string;
  };
  database: {
    url: string;
    maxConnections: number;
    connectionTimeout: number;
  };
  redis: {
    url: string;
    maxRetries: number;
  };
  resilience: {
    circuitBreaker: {
      threshold: number;
      timeout: number;
      resetTimeout: number;
    };
    retry: {
      attempts: number;
      delay: number;
    };
    timeout: {
      request: number;
    };
  };
}

const configSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  HOST: Joi.string().default('0.0.0.0'),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  LOG_FORMAT: Joi.string()
    .valid('json', 'simple')
    .default('json'),
  SERVICE_NAME: Joi.string().default('twelve-factor-app'),
  JAEGER_ENDPOINT: Joi.string().default('http://localhost:14268/api/traces'),
  TRACING_ENABLED: Joi.boolean().default(true),
  METRICS_PATH: Joi.string().default('/metrics'),
  HEALTH_PATH: Joi.string().default('/health'),
  DATABASE_URL: Joi.string().default('postgresql://localhost:5432/app'),
  DATABASE_MAX_CONNECTIONS: Joi.number().default(10),
  DATABASE_CONNECTION_TIMEOUT: Joi.number().default(30000),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  REDIS_MAX_RETRIES: Joi.number().default(3),
  CIRCUIT_BREAKER_THRESHOLD: Joi.number().default(5),
  CIRCUIT_BREAKER_TIMEOUT: Joi.number().default(60000),
  CIRCUIT_BREAKER_RESET_TIMEOUT: Joi.number().default(30000),
  RETRY_ATTEMPTS: Joi.number().default(3),
  RETRY_DELAY: Joi.number().default(1000),
  REQUEST_TIMEOUT: Joi.number().default(30000),
});

const { error, value: envVars } = configSchema.validate(process.env, {
  allowUnknown: true,
  stripUnknown: true,
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config: Config = {
  app: {
    name: 'twelve-factor-app',
    version: process.env.npm_package_version || '1.0.0',
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    host: envVars.HOST,
  },
  logging: {
    level: envVars.LOG_LEVEL,
    format: envVars.LOG_FORMAT,
  },
  tracing: {
    serviceName: envVars.SERVICE_NAME,
    jaegerEndpoint: envVars.JAEGER_ENDPOINT,
    enabled: envVars.TRACING_ENABLED,
  },
  monitoring: {
    metricsPath: envVars.METRICS_PATH,
    healthPath: envVars.HEALTH_PATH,
  },
  database: {
    url: envVars.DATABASE_URL,
    maxConnections: envVars.DATABASE_MAX_CONNECTIONS,
    connectionTimeout: envVars.DATABASE_CONNECTION_TIMEOUT,
  },
  redis: {
    url: envVars.REDIS_URL,
    maxRetries: envVars.REDIS_MAX_RETRIES,
  },
  resilience: {
    circuitBreaker: {
      threshold: envVars.CIRCUIT_BREAKER_THRESHOLD,
      timeout: envVars.CIRCUIT_BREAKER_TIMEOUT,
      resetTimeout: envVars.CIRCUIT_BREAKER_RESET_TIMEOUT,
    },
    retry: {
      attempts: envVars.RETRY_ATTEMPTS,
      delay: envVars.RETRY_DELAY,
    },
    timeout: {
      request: envVars.REQUEST_TIMEOUT,
    },
  },
};

export default config;