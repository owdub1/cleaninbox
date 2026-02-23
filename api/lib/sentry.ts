/**
 * Sentry Backend Integration
 *
 * Provides a wrapper for Vercel serverless function handlers
 * that catches unhandled errors and reports them to Sentry.
 */

import * as Sentry from '@sentry/node';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
  initialized = true;
}

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<any>;

export function withSentry(handler: Handler): Handler {
  return async (req: VercelRequest, res: VercelResponse) => {
    ensureInitialized();
    try {
      return await handler(req, res);
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          method: req.method,
          url: req.url,
        },
      });
      await Sentry.flush(2000);
      throw error;
    }
  };
}
