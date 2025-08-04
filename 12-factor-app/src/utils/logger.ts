import winston from 'winston';
import { config } from '../config';
import { tracingService } from '../monitoring/tracing';

interface LogContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  service?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
  [key: string]: unknown;
}

class Logger {
  private winston: winston.Logger;

  constructor() {
    const formats = [];

    if (config.logging.format === 'json') {
      formats.push(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf((info) => {
          const { timestamp, level, message, ...meta } = info;
          
          const logEntry = {
            timestamp,
            level,
            message,
            service: config.tracing.serviceName,
            version: config.app.version,
            environment: config.app.env,
            traceId: tracingService.getTraceId(),
            spanId: tracingService.getSpanId(),
            ...meta,
          };

          return JSON.stringify(logEntry);
        })
      );
    } else {
      formats.push(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.printf((info) => {
          const { timestamp, level, message, ...meta } = info;
          const traceId = tracingService.getTraceId();
          const spanId = tracingService.getSpanId();
          
          let logMessage = `${timestamp} [${level.toUpperCase()}] ${message}`;
          
          if (traceId && spanId) {
            logMessage += ` [trace:${traceId.substring(0, 8)} span:${spanId.substring(0, 8)}]`;
          }
          
          if (Object.keys(meta).length > 0) {
            logMessage += ` ${JSON.stringify(meta)}`;
          }
          
          return logMessage;
        })
      );
    }

    this.winston = winston.createLogger({
      level: config.logging.level,
      format: winston.format.combine(...formats),
      defaultMeta: {
        service: config.tracing.serviceName,
        version: config.app.version,
        environment: config.app.env,
      },
      transports: [
        new winston.transports.Console({
          handleExceptions: true,
          handleRejections: true,
        }),
      ],
      exitOnError: false,
    });

    if (config.app.env === 'production') {
      this.winston.add(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          handleExceptions: true,
          maxsize: 5242880,
          maxFiles: 5,
        })
      );

      this.winston.add(
        new winston.transports.File({
          filename: 'logs/combined.log',
          handleExceptions: true,
          maxsize: 5242880,
          maxFiles: 5,
        })
      );
    }
  }

  private formatMessage(message: string, context?: LogContext): [string, LogContext] {
    const enrichedContext: LogContext = {
      ...context,
      traceId: context?.traceId || tracingService.getTraceId(),
      spanId: context?.spanId || tracingService.getSpanId(),
    };

    return [message, enrichedContext];
  }

  public debug(message: string, context?: LogContext): void {
    const [msg, ctx] = this.formatMessage(message, context);
    this.winston.debug(msg, ctx);
  }

  public info(message: string, context?: LogContext): void {
    const [msg, ctx] = this.formatMessage(message, context);
    this.winston.info(msg, ctx);
  }

  public warn(message: string, context?: LogContext): void {
    const [msg, ctx] = this.formatMessage(message, context);
    this.winston.warn(msg, ctx);
  }

  public error(message: string, error?: Error, context?: LogContext): void {
    const [msg, ctx] = this.formatMessage(message, {
      ...context,
      error: error || context?.error,
      stack: error?.stack || context?.error?.stack,
    });
    this.winston.error(msg, ctx);
  }

  public http(message: string, context: LogContext): void {
    const [msg, ctx] = this.formatMessage(message, context);
    this.winston.http(msg, ctx);
  }

  public logRequest(req: { method: string; url: string; ip?: string; headers: Record<string, unknown> }, context?: LogContext): void {
    this.http('HTTP Request', {
      ...context,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type'],
    });
  }

  public logResponse(
    req: { method: string; url: string },
    res: { statusCode: number },
    duration: number,
    context?: LogContext
  ): void {
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    const message = `HTTP Response ${res.statusCode}`;
    
    const logContext = {
      ...context,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
    };

    if (level === 'warn') {
      this.warn(message, logContext);
    } else {
      this.info(message, logContext);
    }
  }

  public logError(error: Error, context?: LogContext): void {
    this.error('Application Error', error, {
      ...context,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    });
  }

  public createChildLogger(defaultContext: LogContext): Logger {
    const childLogger = Object.create(this);
    const originalFormatMessage = this.formatMessage.bind(this);
    
    childLogger.formatMessage = (message: string, context?: LogContext): [string, LogContext] => {
      return originalFormatMessage(message, { ...defaultContext, ...context });
    };
    
    return childLogger;
  }

  public getWinstonInstance(): winston.Logger {
    return this.winston;
  }
}

export const logger = new Logger();
export { LogContext };