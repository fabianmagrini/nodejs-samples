process.env.NODE_ENV = 'test';
process.env.LOWER_SERVICE_URL = 'http://localhost:5053';
process.env.UPPER_SERVICE_URL = 'http://localhost:5054';
process.env.DIGIT_SERVICE_URL = 'http://localhost:5051';
process.env.SPECIAL_SERVICE_URL = 'http://localhost:5052';

import request from 'supertest';
import axios from 'axios';
import app, { server } from '../src/index';

// Mock axios so we don't need real character services
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

afterAll((done) => {
  server.close(done);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Generator Service', () => {
  describe('GET /health', () => {
    it('should return 200 with ok status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'generator' });
    });
  });

  describe('GET /generate', () => {
    beforeEach(() => {
      // Mock axios.get to return predictable single char responses
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('5053')) {
          return Promise.resolve({ data: { char: 'a' } });
        } else if (url.includes('5054')) {
          return Promise.resolve({ data: { char: 'A' } });
        } else if (url.includes('5051')) {
          return Promise.resolve({ data: { char: '1' } });
        } else if (url.includes('5052')) {
          return Promise.resolve({ data: { char: '!' } });
        }
        return Promise.resolve({ data: { char: 'x' } });
      });
    });

    it('should return 200', async () => {
      const res = await request(app).get('/generate');
      expect(res.status).toBe(200);
    });

    it('should return JSON with a "password" field', async () => {
      const res = await request(app).get('/generate');
      expect(res.body).toHaveProperty('password');
      expect(typeof res.body.password).toBe('string');
    });

    it('should call all 4 character services', async () => {
      await request(app).get('/generate?lower=1&upper=1&digit=1&special=1');
      // axios.get should have been called 4 times (once per service)
      expect(mockedAxios.get).toHaveBeenCalledTimes(4);
    });

    it('should respect the lower, upper, digit, special query params', async () => {
      const res = await request(app)
        .get('/generate?lower=2&upper=2&digit=2&special=2');
      expect(res.status).toBe(200);
      // 8 calls total: 2 per service
      expect(mockedAxios.get).toHaveBeenCalledTimes(8);
      expect(res.body.password).toHaveLength(8);
    });

    it('should produce a password of the correct total length (default 12)', async () => {
      const res = await request(app).get('/generate?lower=3&upper=3&digit=3&special=3');
      expect(res.body.password).toHaveLength(12);
    });

    it('should handle length param to trim output', async () => {
      const res = await request(app)
        .get('/generate?lower=3&upper=3&digit=3&special=3&length=6');
      expect(res.body.password).toHaveLength(6);
    });

    it('should return 500 when a character service fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Service unavailable'));
      const res = await request(app).get('/generate');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });
});
