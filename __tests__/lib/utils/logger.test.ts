import { logger } from '@/lib/utils/logger';
import * as Sentry from '@sentry/nextjs';

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));

describe('Logger', () => {
  const originalEnv = process.env.NODE_ENV;
  const consoleSpy = {
    debug: jest.spyOn(console, 'debug').mockImplementation(),
    info: jest.spyOn(console, 'info').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(consoleSpy).forEach(spy => spy.mockClear());
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('in development', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should log debug messages', () => {
      logger.debug('Test debug', { foo: 'bar' });

      expect(consoleSpy.debug).toHaveBeenCalledWith(
        '[DEBUG] Test debug',
        { foo: 'bar' }
      );
    });

    it('should log info messages', () => {
      logger.info('Test info');

      expect(consoleSpy.info).toHaveBeenCalledWith('[INFO] Test info', '');
    });

    it('should log warnings', () => {
      logger.warn('Test warning', { code: 123 });

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[WARN] Test warning',
        { code: 123 }
      );
    });

    it('should log errors', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error, { context: 'test' });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[ERROR] Error occurred',
        error,
        { context: 'test' }
      );
    });
  });

  describe('in production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should not log debug messages', () => {
      logger.debug('Test debug');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('should not log info messages', () => {
      logger.info('Test info');

      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it('should log warnings and send to Sentry', () => {
      logger.warn('Test warning', { foo: 'bar' });

      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Test warning',
        expect.objectContaining({
          level: 'warning',
          extra: { foo: 'bar' },
        })
      );
    });

    it('should log errors and send to Sentry', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(consoleSpy.error).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: expect.objectContaining({
            message: 'Error occurred',
          }),
        })
      );
    });
  });

  describe('security logging', () => {
    it('should always log security events', () => {
      process.env.NODE_ENV = 'development';
      logger.security('Security event', { ip: '1.2.3.4' });

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[SECURITY] Security event',
        { ip: '1.2.3.4' }
      );

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Security event',
        expect.objectContaining({
          level: 'warning',
          tags: { type: 'security' },
          extra: { ip: '1.2.3.4' },
        })
      );
    });

    it('should log security events in production', () => {
      process.env.NODE_ENV = 'production';
      logger.security('SSRF attempt', { url: 'http://localhost' });

      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalled();
    });
  });
});
