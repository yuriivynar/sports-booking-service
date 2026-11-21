import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const API_PREFIX = 'api';

// Vercel Functions do not serve the swagger-ui-dist files from node_modules,
// so the documentation page loads them from a CDN. The version matches the
// one @nestjs/swagger depends on.
const SWAGGER_UI_CDN = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.34.1';

/**
 * Settings shared by the real server (main.ts), the Vercel handler and
 * e2e tests, so tests exercise the same app configuration that runs in
 * production.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({
    origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      // Drop unknown fields and reject requests that send them.
      whitelist: true,
      forbidNonWhitelisted: true,
      // Turn query strings such as ?page=2 into numbers declared in DTOs.
      transform: true,
    }),
  );
  setupSwagger(app);
  return app;
}

function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('SportHub API')
    .setDescription('REST API онлайн-сервісу бронювання спортивних залів і секцій.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'Supabase JWT' })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // UI at /api/docs, OpenAPI JSON at /api/docs-json.
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    customSiteTitle: 'SportHub API',
    customCssUrl: `${SWAGGER_UI_CDN}/swagger-ui.css`,
    customJs: [
      `${SWAGGER_UI_CDN}/swagger-ui-bundle.js`,
      `${SWAGGER_UI_CDN}/swagger-ui-standalone-preset.js`,
    ],
  });
}
