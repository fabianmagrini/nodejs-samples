const assert = require('assert');
const http = require('http');
const path = require('path');

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.server = null;
  }

  async setupServer() {
    process.env.PORT = '3003';
    delete require.cache[require.resolve('../src/config/config')];
    delete require.cache[require.resolve('../src/server')];
    this.server = require('../src/server');
    
    return new Promise((resolve) => {
      const checkServer = () => {
        if (this.server.listening) {
          resolve();
        } else {
          setTimeout(checkServer, 100);
        }
      };
      checkServer();
    });
  }

  async teardownServer() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          resolve();
        });
      });
    }
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('Starting test runner...\n');
    
    try {
      await this.setupServer();
      
      for (const test of this.tests) {
        try {
          console.log(`Running: ${test.name}`);
          await test.fn();
          this.passed++;
          console.log(`✅ ${test.name}\n`);
        } catch (error) {
          this.failed++;
          console.log(`❌ ${test.name}`);
          console.log(`   Error: ${error.message}\n`);
        }
      }
    } finally {
      await this.teardownServer();
    }
    
    console.log(`Test Results:`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Total: ${this.tests.length}`);
    
    process.exit(this.failed > 0 ? 1 : 0);
  }

  async request(options) {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3003,
        ...options
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const body = data ? JSON.parse(data) : null;
            resolve({ statusCode: res.statusCode, headers: res.headers, body });
          } catch {
            resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
          }
        });
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      
      req.end();
    });
  }
}

const runner = new TestRunner();

runner.test('Health check endpoint should return 200', async () => {
  const response = await runner.request({ path: '/health', method: 'GET' });
  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.success, true);
  assert.strictEqual(response.body.data.status, 'OK');
});

runner.test('API info endpoint should return API information', async () => {
  const response = await runner.request({ path: '/', method: 'GET' });
  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.success, true);
  assert.strictEqual(response.body.data.name, 'Vanilla JS API');
});

runner.test('Should handle 404 for unknown endpoints', async () => {
  const response = await runner.request({ path: '/unknown', method: 'GET' });
  assert.strictEqual(response.statusCode, 404);
  assert.strictEqual(response.body.success, false);
});

runner.test('Should create a new user', async () => {
  const userData = {
    name: 'Jane Smith',
    email: `jane.smith.${Date.now()}@example.com`
  };
  
  const response = await runner.request({
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: userData
  });
  
  assert.strictEqual(response.statusCode, 201);
  assert.strictEqual(response.body.success, true);
  assert.strictEqual(response.body.data.name, userData.name);
  assert.strictEqual(response.body.data.email, userData.email);
  assert(response.body.data.id);
});

runner.test('Should get list of users', async () => {
  const response = await runner.request({ path: '/api/users', method: 'GET' });
  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.success, true);
  assert(Array.isArray(response.body.data.users));
});

runner.test('Should create a new product', async () => {
  const productData = {
    name: 'Test Product',
    price: 29.99,
    category: 'electronics',
    description: 'A test product'
  };
  
  const response = await runner.request({
    path: '/api/products',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: productData
  });
  
  assert.strictEqual(response.statusCode, 201);
  assert.strictEqual(response.body.success, true);
  assert.strictEqual(response.body.data.name, productData.name);
  assert.strictEqual(response.body.data.price, productData.price);
  assert(response.body.data.id);
});

runner.test('Should get list of products', async () => {
  const response = await runner.request({ path: '/api/products', method: 'GET' });
  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.success, true);
  assert(Array.isArray(response.body.data.products));
});

runner.test('Should validate required fields for user creation', async () => {
  const response = await runner.request({
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { name: 'John' }
  });
  
  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
});

runner.test('Should validate required fields for product creation', async () => {
  const response = await runner.request({
    path: '/api/products',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { name: 'Product' }
  });
  
  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
});

if (require.main === module) {
  runner.run().catch(console.error);
}

module.exports = TestRunner;