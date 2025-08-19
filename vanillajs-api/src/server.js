const http = require('http');
const Router = require('./utils/router');
const { parseBody, parseUrl } = require('./utils/parser');
const { createResponse } = require('./utils/response');
const { errorHandler } = require('./middleware/error');
const corsMiddleware = require('./middleware/cors');
const loggerMiddleware = require('./middleware/logger');
const config = require('./config/config');
const logger = require('./utils/logger');

const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const indexRoutes = require('./routes/index');

const router = new Router();

router.use(corsMiddleware);
router.use(loggerMiddleware);

router.get('/', indexRoutes.apiInfo);
router.get('/health', indexRoutes.healthCheck);

router.get('/api/users', userRoutes.getUsers);
router.get('/api/users/:id', userRoutes.getUserById);
router.post('/api/users', userRoutes.createUser);
router.put('/api/users/:id', userRoutes.updateUser);
router.delete('/api/users/:id', userRoutes.deleteUser);

router.get('/api/products', productRoutes.getProducts);
router.get('/api/products/:id', productRoutes.getProductById);
router.post('/api/products', productRoutes.createProduct);
router.put('/api/products/:id', productRoutes.updateProduct);
router.delete('/api/products/:id', productRoutes.deleteProduct);

const server = http.createServer(async (req, res) => {
  try {
    const response = createResponse(res);
    
    res.status = response.status.bind(response);
    res.header = response.header.bind(response);
    res.json = response.json.bind(response);
    res.text = response.text.bind(response);
    res.html = response.html.bind(response);
    res.send = response.send.bind(response);
    res.redirect = response.redirect.bind(response);
    res.error = response.error.bind(response);
    res.success = response.success.bind(response);
    
    const { pathname, query } = parseUrl(req);
    req.query = query;
    req.params = {};
    
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      req.body = await parseBody(req);
    }
    
    const handled = await router.handle(req.method, pathname, req, res);
    
    if (!handled && !res.headersSent) {
      indexRoutes.notFound(req, res);
    }
  } catch (error) {
    if (!res.headersSent) {
      errorHandler(error, req, res, () => {});
    }
  }
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

server.listen(config.port, () => {
  logger.info(`Server running on port ${config.port} in ${config.env} mode`);
  logger.info(`API endpoints available at http://localhost:${config.port}`);
});

module.exports = server;