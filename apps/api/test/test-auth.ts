import { createLocalJWKSet, exportJWK, generateKeyPair, type JWK, SignJWT } from 'jose';

/** Fake Supabase project used by e2e tests; set as SUPABASE_URL in vitest.config.e2e.ts. */
export const TEST_SUPABASE_URL = 'https://test-project.supabase.co';
export const TEST_ADMIN_EMAIL = 'admin@example.test';

export interface TokenClaims {
  sub: string;
  email: string;
  userMetadata?: Record<string, unknown>;
}

export interface TokenOptions {
  /** Unix time in seconds; a value in the past produces an expired token. */
  expiresAt?: number;
  issuer?: string;
}

/**
 * Signs access tokens the way Supabase does (ES256), with a key pair created
 * for the test run. The API is given the matching public key set, so tokens
 * from this signer pass and tokens from any other key fail.
 */
export async function createTestSigner() {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const publicJwk: JWK = { ...(await exportJWK(publicKey)), alg: 'ES256', kid: 'test-key' };

  const sign = (claims: TokenClaims, options: TokenOptions = {}) =>
    new SignJWT({
      email: claims.email,
      role: 'authenticated',
      user_metadata: claims.userMetadata ?? {},
    })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setSubject(claims.sub)
      .setIssuer(options.issuer ?? `${TEST_SUPABASE_URL}/auth/v1`)
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime(options.expiresAt ?? '1h')
      .sign(privateKey);

  return { keys: createLocalJWKSet({ keys: [publicJwk] }), sign };
}
