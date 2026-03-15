process.env.NODE_ENV = 'test';

import request from 'supertest';
import app, { server } from '../src/index';

afterAll((done) => {
  server.close(done);
});

describe('Digit Service', () => {
  describe('GET /health', () => {
    it('should return 200 with ok status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'digit' });
    });
  });

  describe('GET /', () => {
    it('should return 200', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
    });

    it('should return JSON with a "char" field', async () => {
      const res = await request(app).get('/');
      expect(res.body).toHaveProperty('char');
      expect(typeof res.body.char).toBe('string');
    });

    it('should return a single digit character', async () => {
      const res = await request(app).get('/');
      const { char } = res.body;
      expect(char).toHaveLength(1);
      expect(char).toMatch(/^[0-9]$/);
    });

    it('should return characters within the digit set', async () => {
      const validChars = new Set('0123456789');
      for (let i = 0; i < 20; i++) {
        const res = await request(app).get('/');
        expect(validChars.has(res.body.char)).toBe(true);
      }
    });
  });
});
