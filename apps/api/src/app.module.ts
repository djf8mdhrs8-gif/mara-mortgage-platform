import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { LoggerModule } from 'nestjs-pino';

import { AuditModule } from './audit/audit.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { AuthModule } from './modules/auth/auth.module';
import { CalculatorsModule } from './modules/calculators/calculators.module';
import { ContentModule } from './modules/content/content.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { LoanProgramsModule } from './modules/loan-programs/loan-programs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StorageModule } from './storage/storage.module';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // First so Sentry's request instrumentation wraps everything below.
    // With no SENTRY_DSN (see instrument.ts) this is all a quiet no-op.
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      // Support running from apps/api (dev) or the repo root (docker/CI)
      envFilePath: ['.env', '../../.env'],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        // Pretty-print locally; ship raw JSON in production for log aggregation
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    // Global rate limit — a generous ceiling for normal API use. Auth routes
    // carry much tighter per-route @Throttle overrides (see AuthController).
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] }),
    PrismaModule,
    AuditModule,
    AuthModule,
    StorageModule,
    ApplicationsModule,
    ArticlesModule,
    CalculatorsModule,
    ContentModule,
    DocumentsModule,
    LoanProgramsModule,
    NotificationsModule,
    HealthModule,
  ],
  providers: [
    // Reports unhandled (5xx) errors to Sentry; expected HttpExceptions pass through.
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
