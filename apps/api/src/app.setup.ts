import { INestApplication } from '@nestjs/common';

export const API_PREFIX = 'api';

/**
 * Settings shared by the real server (main.ts) and e2e tests,
 * so tests exercise the same app configuration that runs in production.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({
    origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
  });
  return app;
}
