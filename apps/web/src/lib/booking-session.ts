import 'server-only';
import { redirect } from 'next/navigation';
import { apiClient } from './api';
import { getAccessToken } from './auth';

/**
 * Pages that book or show bookings need a signed-in user. Returns an API
 * client with the user's token and their bonus balance, or redirects to
 * the sign-in page that brings the user back to `path`.
 */
export async function requireBooker(path: string) {
  const token = await getAccessToken();
  if (!token) redirect(`/login?next=${encodeURIComponent(path)}`);
  const api = apiClient(token);
  const { data: profile, response } = await api.GET('/api/me');
  if (response.status === 401) redirect(`/login?next=${encodeURIComponent(path)}`);
  return { api, bonusBalance: profile?.bonusBalance ?? 0 };
}
