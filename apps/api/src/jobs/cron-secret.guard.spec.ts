import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import { CronSecretGuard } from './cron-secret.guard.js';

const config = (secret?: string) => ({ get: () => secret }) as unknown as ConfigService;
const request = (authorization?: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
  }) as unknown as ExecutionContext;

describe('CronSecretGuard', () => {
  const secret = 'a'.repeat(48);
  const guard = new CronSecretGuard(config(secret));

  it('lets the scheduler in with the right secret', () => {
    expect(guard.canActivate(request(`Bearer ${secret}`))).toBe(true);
  });

  it.each([undefined, '', 'Bearer ', `Bearer ${secret}x`, `Bearer ${'a'.repeat(47)}`, secret])(
    'refuses %s',
    (header) => {
      expect(() => guard.canActivate(request(header))).toThrow(UnauthorizedException);
    },
  );

  it('stays closed when no secret is configured', () => {
    expect(() => new CronSecretGuard(config()).canActivate(request('Bearer '))).toThrow(
      ServiceUnavailableException,
    );
  });
});
