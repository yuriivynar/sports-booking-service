import { SUPABASE_URL } from './supabase/env';

/** Public URL of a file in the Supabase Storage "media" bucket. */
export function mediaUrl(path: string): string | null {
  return SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/media/${path}` : null;
}

/** Wide photo behind the home page headline. */
export const HERO_PHOTO = mediaUrl('seed/hero.jpg');
