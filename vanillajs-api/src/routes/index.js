
const healthCheck = async (req, res) => {
  res.success({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    node: process.version
  }, 'API is running');
};

const apiInfo = async (req, res) => {
  res.success({
    name: 'Vanilla JS API',
    description: 'A Node.js API built with vanilla JavaScript',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      users: {
        list: 'GET /api/users',
        get: 'GET /api/users/:id',
        create: 'POST /api/users',
        update: 'PUT /api/users/:id',
        delete: 'DELETE /api/users/:id'
      },
      products: {
        list: 'GET /api/products',
        get: 'GET /api/products/:id',
        create: 'POST /api/products',
        update: 'PUT /api/products/:id',
        delete: 'DELETE /api/products/:id'
      }
    }
  }, 'API Information');
};

const notFound = async (req, res) => {
  res.error('Endpoint not found', 404);
};

module.exports = {
  healthCheck,
  apiInfo,
  notFound
};