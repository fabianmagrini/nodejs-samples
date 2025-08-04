beforeAll(() => {
  process.env['NODE_ENV'] = 'test';
  process.env['LOG_LEVEL'] = 'error';
  process.env['TRACING_ENABLED'] = 'false';
  process.env['PORT'] = '0';
});

afterAll(() => {
  jest.restoreAllMocks();
});