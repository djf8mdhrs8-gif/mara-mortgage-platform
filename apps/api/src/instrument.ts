// Sentry must initialize before Nest (and everything Nest imports) loads, so
// this module is imported first in main.ts. With no SENTRY_DSN the SDK stays
// disabled and adds nothing — local dev works without an account.
import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN;

if (dsn !== undefined && dsn !== '') {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Error monitoring is the goal here; keep performance tracing cheap.
    tracesSampleRate: 0.1,
    // PII (emails, tokens, document names) must not ride along by default.
    sendDefaultPii: false,
  });
}
