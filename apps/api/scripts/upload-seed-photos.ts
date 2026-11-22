// Copies the demo photos from Unsplash into the Supabase Storage bucket.
// Run once per Supabase project (re-running overwrites the same files):
//
//   pnpm --filter api photos:upload
//
// Needs SUPABASE_URL and SUPABASE_SECRET_KEY in apps/api/.env.

import { createClient } from '@supabase/supabase-js';
import { ALL_PHOTOS, HERO_PHOTO, MEDIA_BUCKET } from '../prisma/seed-photos.js';

try {
  process.loadEnvFile();
} catch {
  // No .env file: the environment already holds the variables.
}

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY first.');

const storage = createClient(url, secretKey, { auth: { persistSession: false } }).storage;

for (const photo of ALL_PHOTOS) {
  // Imgix parameters on images.unsplash.com: crop to the size the site uses
  // and let next/image produce the AVIF/WebP variants from this master.
  const width = photo === HERO_PHOTO ? 2400 : 1600;
  const source = `https://images.unsplash.com/${photo.image}?w=${width}&q=80&fm=jpg&fit=crop&ar=16:10`;
  const response = await fetch(source);
  if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`);
  const body = new Uint8Array(await response.arrayBuffer());

  const { error } = await storage.from(MEDIA_BUCKET).upload(photo.path, body, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: true,
  });
  if (error) throw new Error(`${photo.path}: ${error.message}`);
  console.log(`✔ ${photo.path} (${Math.round(body.length / 1024)} KB) — ${photo.photographer}`);
}
