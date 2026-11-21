import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pages render per-user data from the NestJS API, so we keep the
  // dynamic-by-default model instead of opt-in Cache Components.
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
