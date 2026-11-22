import type { NextConfig } from 'next';

// Photos live in Supabase Storage; profile pictures from Google sign-in come
// from googleusercontent.com. next/image only optimizes hosts listed here.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co';

const nextConfig: NextConfig = {
  // Pages render per-user data from the NestJS API, so we keep the
  // dynamic-by-default model instead of opt-in Cache Components.
  images: {
    // AVIF first (smallest), WebP as the fallback.
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
