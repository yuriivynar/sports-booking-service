import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export function proxy(request: NextRequest) {
  // When the requested redirect URL is not on Supabase's allow list, Supabase
  // sends the OAuth code to the Site URL instead ("/?code=..."). Forward it to
  // the callback, so sign-in still completes.
  const code = request.nextUrl.searchParams.get('code');
  if (code && request.nextUrl.pathname !== '/auth/callback') {
    const callback = new URL('/auth/callback', request.url);
    callback.searchParams.set('code', code);
    return NextResponse.redirect(callback);
  }
  return updateSession(request);
}

export const config = {
  // Every page, but not static files and images.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
