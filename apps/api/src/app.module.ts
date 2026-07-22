import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { ApplicationsModule } from './modules/applications/applications.module';
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
    PrismaModule,
    AuthModule,
    StorageModule,
    ApplicationsModule,
    CalculatorsModule,
    ContentModule,
    DocumentsModule,
    LoanProgramsModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class AppModule {}
