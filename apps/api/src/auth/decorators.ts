import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '../generated/prisma/client.js';
import type { AuthenticatedRequest, CurrentUserData } from './authenticated-user.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/** Opens a route or controller to anonymous visitors. Everything else needs a token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restricts a route or controller to the listed roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Injects the signed-in user that AuthGuard attached to the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserData =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user!,
);
