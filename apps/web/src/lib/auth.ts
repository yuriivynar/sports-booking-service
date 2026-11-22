import 'server-only';
import { createSupabaseServerClient } from './supabase/server';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

/** The signed-in user, from a verified Supabase token, or null for guests. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || typeof claims.email !== 'string') return null;

  const metadata = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === 'string' && value ? value : null);
  return {
    id: claims.sub,
    email: claims.email,
    name: text(metadata.full_name) ?? text(metadata.name),
    // An uploaded photo wins over the one from the Google account.
    avatarUrl:
      text(metadata.custom_avatar_url) ?? text(metadata.avatar_url) ?? text(metadata.picture),
  };
}

/**
 * Access token to forward to the NestJS API, which verifies it itself.
 * Null when nobody is signed in.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
