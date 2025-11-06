/**
 * Structured logging utility
 * Replaces console.log/warn/error with proper logging that:
 * - Only logs in development
 * - Sends errors to Sentry in production
 * - Provides type-safe logging interface
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security';

interface LogMeta {
  [key: string]: any;
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (process.env.NODE_ENV === 'production') {
      // In production, only log warnings and errors
      return level === 'error' || level === 'warn' || level === 'security';
    }
    // In development, log everything
    return true;
  }

  /**
   * Debug-level logging (development only)
   */
  debug(message: string, meta?: LogMeta) {
    if (!this.shouldLog('debug')) return;
    console.debug(`[DEBUG] ${message}`, meta || '');
  }

  /**
   * Info-level logging (development only)
   */
  info(message: string, meta?: LogMeta) {
    if (!this.shouldLog('info')) return;
    console.info(`[INFO] ${message}`, meta || '');
  }

  /**
   * Warning-level logging
   * Sent to Sentry in production
   */
  warn(message: string, meta?: LogMeta) {
    if (!this.shouldLog('warn')) return;
    console.warn(`[WARN] ${message}`, meta || '');

    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: meta,
      });
    }
  }

  /**
   * Error-level logging
   * Always sent to Sentry in production
   */
  error(message: string, error?: Error | unknown, meta?: LogMeta) {
    if (!this.shouldLog('error')) return;

    const errorObj = error instanceof Error ? error : new Error(String(error));

    console.error(`[ERROR] ${message}`, errorObj, meta || '');

    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(errorObj, {
        extra: {
          message,
          ...meta,
        },
      });
    }
  }

  /**
   * Security event logging
   * ALWAYS logged and sent to Sentry, even in development
   */
  security(message: string, meta?: LogMeta) {
    console.warn(`[SECURITY] ${message}`, meta || '');

    Sentry.captureMessage(message, {
      level: 'warning',
      tags: { type: 'security' },
      extra: meta,
    });
  }
}

export const logger = new Logger();
