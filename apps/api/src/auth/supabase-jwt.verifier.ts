import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type JWTVerifyGetKey, jwtVerify } from 'jose';

/** DI token for the key set that signs Supabase access tokens. */
export const SUPABASE_JWKS = Symbol('SUPABASE_JWKS');

/** Claims of a Supabase access token that the API relies on. */
export interface SupabaseClaims {
  /** Supabase Auth user id. */
  sub: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export function supabaseIssuer(config: ConfigService): string {
  return `${config.getOrThrow<string>('SUPABASE_URL').replace(/\/$/, '')}/auth/v1`;
}

/**
 * Verifies Supabase access tokens with the project's public signing keys
 * (JWKS, ES256). The API never sees a shared secret, and key rotation in
 * Supabase needs no change here: jose refetches the key set when a token
 * names an unknown key.
 */
@Injectable()
export class SupabaseJwtVerifier {
  private readonly issuer: string;

  constructor(
    config: ConfigService,
    @Inject(SUPABASE_JWKS) private readonly keys: JWTVerifyGetKey,
  ) {
    this.issuer = supabaseIssuer(config);
  }

  async verify(token: string): Promise<SupabaseClaims> {
    const { payload } = await jwtVerify(token, this.keys, {
      issuer: this.issuer,
      audience: 'authenticated',
    });
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      throw new Error('Access token has no subject or email');
    }
    const metadata = (payload.user_metadata ?? {}) as Record<string, unknown>;
    const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);
    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      // Google sign-in fills full_name/avatar_url (or name/picture).
      fullName: text(metadata.full_name) ?? text(metadata.name),
      avatarUrl: text(metadata.avatar_url) ?? text(metadata.picture),
    };
  }
}
