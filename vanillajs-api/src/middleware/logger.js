const logger = require('../utils/logger');

function loggerMiddleware(req, res, next) {
  const startTime = Date.now();
  
  logger.request(req);
  
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    return originalSend.call(this, data);
  };
  
  next();
}

module.exports = loggerMiddleware;