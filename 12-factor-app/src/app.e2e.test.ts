import request from 'supertest';
import { Application } from 'express';
import { createApp } from './app';
import { TestHelper } from './test/helpers';

describe('Application E2E Tests', () => {
  let app: Application;
  let testHelper: TestHelper;

  beforeAll(() => {
    app = createApp();
    testHelper = new TestHelper(app);
  });

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await testHelper.healthCheck();
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('checks');
    });

    it('should return readiness status', async () => {
      const response = await testHelper.readinessCheck();
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ready');
    });

    it('should return liveness status', async () => {
      const response = await testHelper.livenessCheck();
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'alive');
    });

    it('should return metrics', async () => {
      const response = await testHelper.metricsCheck();
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('twelve_factor_app_');
    });
  });

  describe('User API', () => {
    let createdUserId: string;

    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const response = await testHelper.makeRequest('post', '/api/users', userData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User created successfully');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email', userData.email);
      expect(response.body.data).toHaveProperty('name', userData.name);
      
      createdUserId = response.body.data.id;
    });

    it('should get user by ID', async () => {
      const response = await testHelper.makeRequest('get', `/api/users/${createdUserId}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'User retrieved successfully');
      expect(response.body.data).toHaveProperty('id', createdUserId);
    });

    it('should update user', async () => {
      const updateData = { name: 'Updated Test User' };
      
      const response = await testHelper.makeRequest('put', `/api/users/${createdUserId}`, updateData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'User updated successfully');
      expect(response.body.data).toHaveProperty('name', updateData.name);
    });

    it('should get all users', async () => {
      const response = await testHelper.makeRequest('get', '/api/users');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Users retrieved successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should delete user', async () => {
      const response = await testHelper.makeRequest('delete', `/api/users/${createdUserId}`);
      
      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await testHelper.makeRequest('get', '/api/users/non-existent-id');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });

    it('should validate user creation input', async () => {
      const invalidData = { email: 'invalid-email', name: '' };
      
      const response = await testHelper.makeRequest('post', '/api/users', invalidData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await testHelper.makeRequest('get', '/api/non-existent');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });
  });

  describe('Load Testing', () => {
    it('should handle concurrent requests', async () => {
      const responses = await testHelper.simulateLoad('/health', 50, 10);
      
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBe(50);
    });
  });
});