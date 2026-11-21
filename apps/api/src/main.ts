import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

// Vercel calls this exported request handler instead of a listening server.
export { default } from './serverless.js';

/** Long-running HTTP server for local development and `node dist/main.js`. */
async function bootstrap(): Promise<void> {
  const app = configureApp(await NestFactory.create(AppModule));
  await app.listen(process.env.PORT ?? 4000);
}

if (!process.env.VERCEL) {
  void bootstrap();
}
