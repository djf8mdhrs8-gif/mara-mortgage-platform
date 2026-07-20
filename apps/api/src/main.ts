import { writeFileSync } from 'node:fs';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // bufferLogs: hold early logs until the pino logger is attached, so nothing is lost or unstructured
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties from payloads
      forbidNonWhitelisted: true, // ...and reject requests that include them
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  // Dev-only CORS so the Expo web preview (different port) can call the API.
  // Production origins are locked down when we deploy (see ARCHITECTURE.md §6).
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors();
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mara Mortgage API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const buildDocument = (): ReturnType<typeof SwaggerModule.createDocument> =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, buildDocument);

  // Spec-emission mode: write openapi.json and exit instead of serving.
  // Used by `pnpm openapi:generate` to feed the typed-client pipeline.
  if (process.env.GENERATE_OPENAPI === '1') {
    const outPath = process.env.OPENAPI_OUT ?? 'openapi.json';
    writeFileSync(outPath, `${JSON.stringify(buildDocument(), null, 2)}\n`);
    await app.close();
    return;
  }

  const config = app.get(ConfigService);
  const port = config.get<number>('API_PORT', 3001);
  await app.listen(port);
}

void bootstrap();
