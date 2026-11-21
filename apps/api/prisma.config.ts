import { defineConfig } from 'prisma/config';

// Prisma 7 no longer loads .env by itself. Load it for local development;
// CI and Vercel pass real environment variables and have no .env file.
try {
  process.loadEnvFile();
} catch {
  // No .env file: the environment already holds the variables.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // The CLI runs migrations, which need a session-mode connection
    // (Supabase session pooler). The app uses DATABASE_URL at runtime.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
