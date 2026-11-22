import { createHash, timingSafeEqual } from 'node:crypto';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Lets the scheduler in: the request must carry `Authorization: Bearer
 * <CRON_SECRET>`. Both values are hashed first, so timingSafeEqual always
 * compares 32 bytes and the time taken reveals nothing about the secret.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  private readonly expected: Buffer | null;

  constructor(config: ConfigService) {
    const secret = config.get<string>('CRON_SECRET');
    this.expected = secret ? sha256(secret) : null;
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.expected) throw new ServiceUnavailableException('CRON_SECRET is not configured');
    const header = context.switchToHttp().getRequest<Request>().headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token || !timingSafeEqual(sha256(token), this.expected)) {
      throw new UnauthorizedException();
    }
    return true;
  }
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}
