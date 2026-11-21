import { ServiceUnavailableException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { HealthController } from './health.controller.js';

function controllerWithDatabase(query: () => Promise<unknown>): HealthController {
  const prisma = { $queryRaw: vi.fn(query) } as unknown as PrismaService;
  return new HealthController(prisma);
}

describe('HealthController', () => {
  it('reports ok when the database answers', async () => {
    const result = await controllerWithDatabase(() => Promise.resolve([{ '?column?': 1 }])).check();

    expect(result).toMatchObject({ status: 'ok', database: 'up' });
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('responds 503 when the database is unreachable', async () => {
    const controller = controllerWithDatabase(() => Promise.reject(new Error('ECONNREFUSED')));

    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
