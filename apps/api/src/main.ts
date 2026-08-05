import './instrument';

import { writeFileSync } from 'node:fs';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // bufferLogs: hold early logs until the pino logger is attached, so nothing is lost or unstructured
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  // CSP off: Swagger UI at /api/docs loads inline scripts the default policy
  // would block, and the API itself serves JSON, not HTML.
  app.use(helmet({ contentSecurityPolicy: false }));
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

  // CORS: dev is permissive so the Expo web preview (different port) can call
  // the API; production allows exactly the origins listed in WEB_ORIGINS
  // (comma-separated — the deployed borrower web app + admin site).
  if (process.env.NODE_ENV === 'production') {
    const webOrigins = (process.env.WEB_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
    if (webOrigins.length > 0) {
      app.enableCors({ origin: webOrigins });
    }
  } else {
    app.enableCors();
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mara Mortgage API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const buildDocument = (): ReturnType<typeof SwaggerModule.createDocument> =>
    SwaggerModule.createDocument(app, swaggerConfig);
  // Swagger UI is a development tool. The deployed API answers on the public
  // internet, so it doesn't publish its full endpoint surface there; spec
  // generation below builds the document directly and is unaffected.
  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('api/docs', app, buildDocument);
  }

  // Spec-emission mode: write openapi.json and exit instead of serving.
  // Used by `pnpm openapi:generate` to feed the typed-client pipeline.
  if (process.env.GENERATE_OPENAPI === '1') {
    const outPath = process.env.OPENAPI_OUT ?? 'openapi.json';
    writeFileSync(outPath, `${JSON.stringify(buildDocument(), null, 2)}\n`);
    await app.close();
    return;
  }

  const config = app.get(ConfigService);
  // PaaS hosts (Render/Fly/Heroku) inject PORT; API_PORT is the local dev knob.
  const port = config.get<number>('PORT') ?? config.get<number>('API_PORT', 3001);
  await app.listen(port);
}

void bootstrap();
