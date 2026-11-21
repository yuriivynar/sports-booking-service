import type { Request } from 'express';
import type { Role } from '../generated/prisma/client.js';

/** The signed-in user as the rest of the API sees it. */
export interface CurrentUserData {
  id: string;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: CurrentUserData;
}
