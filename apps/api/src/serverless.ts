import type { IncomingMessage, ServerResponse } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

type NodeRequestHandler = (req: IncomingMessage, res: ServerResponse) => void;

let handlerPromise: Promise<NodeRequestHandler> | undefined;

async function createNestHandler(): Promise<NodeRequestHandler> {
  const app = configureApp(await NestFactory.create(AppModule));
  await app.init();
  // With @nestjs/platform-express the instance is the Express app: a (req, res) handler.
  const expressApp: NodeRequestHandler = app.getHttpAdapter().getInstance();
  return expressApp;
}

/**
 * Serverless entry point for Vercel Functions.
 *
 * The Nest application is created on the first request and reused while the
 * function instance stays warm, so only cold starts pay the bootstrap cost.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  handlerPromise ??= createNestHandler().catch((error: unknown) => {
    handlerPromise = undefined; // let the next request retry a failed bootstrap
    throw error;
  });
  const nestHandler = await handlerPromise;
  nestHandler(req, res);
}
