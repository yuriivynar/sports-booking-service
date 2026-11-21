import { NextResponse } from 'next/server';
import { safePath } from '@/lib/safe-path';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Google (through Supabase) sends the browser back here with a one-time
 * `code`. Exchanging it stores the session in cookies; this is the PKCE
 * step of the OAuth flow.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const target = safePath(url.searchParams.get('next'));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(target, url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=callback', url.origin));
}
