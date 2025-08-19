const config = require('../config/config');

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  
  if (config.cors.origin === '*' || config.cors.origin.includes(origin)) {
    res.header('Access-Control-Allow-Origin', config.cors.origin);
  }
  
  res.header('Access-Control-Allow-Methods', config.cors.methods.join(', '));
  res.header('Access-Control-Allow-Headers', config.cors.headers.join(', '));
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }
  
  next();
}

module.exports = corsMiddleware;