const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

function errorHandler(error, req, res, next) {
  let { statusCode = 500, message } = error;
  
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
  }
  
  logger.error(`Error ${statusCode}: ${message} - ${req.method} ${req.url}`);
  
  if (statusCode >= 500) {
    logger.error(error.stack);
  }
  
  if (!res.headersSent) {
    res.status(statusCode).json({
      success: false,
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      timestamp: new Date().toISOString()
    });
  }
}

function asyncHandler(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  AppError,
  errorHandler,
  asyncHandler
};