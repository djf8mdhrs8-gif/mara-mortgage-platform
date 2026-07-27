import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
