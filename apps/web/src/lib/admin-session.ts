import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { apiClient } from './api';
import { getAccessToken } from './auth';

/** One /api/me call per request, shared by the admin layout and the page. */
const loadViewer = cache(async () => {
  const token = await getAccessToken();
  if (!token) return { api: null, signedIn: false, isAdmin: false };
  const api = apiClient(token);
  const { data: profile, response } = await api.GET('/api/me');
  return { api, signedIn: response.status !== 401, isAdmin: profile?.role === 'ADMIN' };
});

/**
 * Admin pages: a guest goes to sign-in, a signed-in client gets a 404 (the
 * page does not admit it exists). The API checks the role again on every
 * request, so this guard shapes the interface; it is not the security.
 */
export async function requireAdmin(path: string = '/admin') {
  const viewer = await loadViewer();
  if (!viewer.api || !viewer.signedIn) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!viewer.isAdmin) notFound();
  return viewer.api;
}
