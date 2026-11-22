import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { apiClient } from './index';

/** Typed API client for Client Components, carrying the current session's token. */
export async function browserApi() {
  const { data } = await createSupabaseBrowserClient().auth.getSession();
  return apiClient(data.session?.access_token);
}
