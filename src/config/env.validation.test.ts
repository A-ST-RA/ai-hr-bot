import { validateEnv } from './env.validation';

describe('Env Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Сохраняем оригинальные переменные окружения
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Восстанавливаем оригинальные переменные окружения
    process.env = originalEnv;
  });

  it('should validate correct environment variables', () => {
    process.env.AVITO_CLIENT_ID = 'test-client-id';
    process.env.AVITO_CLIENT_SECRET = 'test-client-secret';
    process.env.AVITO_USER_ID = '12345';
    process.env.DEEPSEEK_API_KEY = 'test-api-key';

    const result = validateEnv();

    expect(result.AVITO_CLIENT_ID).toBe('test-client-id');
    expect(result.AVITO_CLIENT_SECRET).toBe('test-client-secret');
    expect(result.AVITO_USER_ID).toBe('12345');
    expect(result.DEEPSEEK_API_KEY).toBe('test-api-key');
    expect(result.DEEPSEEK_MODEL).toBe('deepseek-chat'); // default value
  });

  it('should use custom DEEPSEEK_MODEL if provided', () => {
    process.env.AVITO_CLIENT_ID = 'test-client-id';
    process.env.AVITO_CLIENT_SECRET = 'test-client-secret';
    process.env.AVITO_USER_ID = '12345';
    process.env.DEEPSEEK_API_KEY = 'test-api-key';
    process.env.DEEPSEEK_MODEL = 'custom-model';

    const result = validateEnv();

    expect(result.DEEPSEEK_MODEL).toBe('custom-model');
  });

  it('should accept valid WEBHOOK_URL', () => {
    process.env.AVITO_CLIENT_ID = 'test-client-id';
    process.env.AVITO_CLIENT_SECRET = 'test-client-secret';
    process.env.AVITO_USER_ID = '12345';
    process.env.DEEPSEEK_API_KEY = 'test-api-key';
    process.env.WEBHOOK_URL = 'https://example.com/webhook';

    const result = validateEnv();

    expect(result.WEBHOOK_URL).toBe('https://example.com/webhook');
  });

  it('should throw error if AVITO_CLIENT_ID is missing', () => {
    process.env.AVITO_CLIENT_SECRET = 'test-client-secret';
    process.env.AVITO_USER_ID = '12345';
    process.env.DEEPSEEK_API_KEY = 'test-api-key';

    expect(() => validateEnv()).toThrow('Invalid environment variables');
  });

  it('should throw error if AVITO_CLIENT_SECRET is missing', () => {
    process.env.AVITO_CLIENT_ID = 'test-client-id';
    process.env.AVITO_USER_ID = '12345';
    process.env.DEEPSEEK_API_KEY = 'test-api-key';

    expect(() => validateEnv()).toThrow('Invalid environment variables');
  });

  it('should throw error if AVITO_USER_ID is missing', () => {
    process.env.AVITO_CLIENT_ID = 'test-client-id';
    process.env.AVITO_CLIENT_SECRET = 'test-client-secret';
    process.env.DEEPSEEK_API_KEY = 'test-api-key';

    expect(() => validateEnv()).toThrow('Invalid environment variables');
  });

  it('should throw error if DEEPSEEK_API_KEY is missing', () => {
    process.env.AVITO_CLIENT_ID = 'test-client-id';
    process.env.AVITO_CLIENT_SECRET = 'test-client-secret';
    process.env.AVITO_USER_ID = '12345';

    expect(() => validateEnv()).toThrow('Invalid environment variables');
  });

  it('should throw error if WEBHOOK_URL is invalid URL', () => {
    process.env.AVITO_CLIENT_ID = 'test-client-id';
    process.env.AVITO_CLIENT_SECRET = 'test-client-secret';
    process.env.AVITO_USER_ID = '12345';
    process.env.DEEPSEEK_API_KEY = 'test-api-key';
    process.env.WEBHOOK_URL = 'not-a-valid-url';

    expect(() => validateEnv()).toThrow('Invalid environment variables');
  });

  it('should accept IP address in WEBHOOK_URL', () => {
    process.env.AVITO_CLIENT_ID = 'test-client-id';
    process.env.AVITO_CLIENT_SECRET = 'test-client-secret';
    process.env.AVITO_USER_ID = '12345';
    process.env.DEEPSEEK_API_KEY = 'test-api-key';
    process.env.WEBHOOK_URL = 'http://192.168.1.100:1337/api/webhook/avito';

    const result = validateEnv();

    expect(result.WEBHOOK_URL).toBe('http://192.168.1.100:1337/api/webhook/avito');
  });

  it('should accept IP address with HTTPS', () => {
    process.env.AVITO_CLIENT_ID = 'test-client-id';
    process.env.AVITO_CLIENT_SECRET = 'test-client-secret';
    process.env.AVITO_USER_ID = '12345';
    process.env.DEEPSEEK_API_KEY = 'test-api-key';
    process.env.WEBHOOK_URL = 'https://10.0.0.1/api/webhook/avito';

    const result = validateEnv();

    expect(result.WEBHOOK_URL).toBe('https://10.0.0.1/api/webhook/avito');
  });

  it('should reject URL without protocol', () => {
    process.env.AVITO_CLIENT_ID = 'test-client-id';
    process.env.AVITO_CLIENT_SECRET = 'test-client-secret';
    process.env.AVITO_USER_ID = '12345';
    process.env.DEEPSEEK_API_KEY = 'test-api-key';
    process.env.WEBHOOK_URL = '192.168.1.100:1337/api/webhook/avito';

    expect(() => validateEnv()).toThrow('Invalid environment variables');
  });

  it('should accept optional WEBHOOK_URL', () => {
    process.env.AVITO_CLIENT_ID = 'test-client-id';
    process.env.AVITO_CLIENT_SECRET = 'test-client-secret';
    process.env.AVITO_USER_ID = '12345';
    process.env.DEEPSEEK_API_KEY = 'test-api-key';
    delete process.env.WEBHOOK_URL;

    const result = validateEnv();

    expect(result.WEBHOOK_URL).toBeUndefined();
  });
});

