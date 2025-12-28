import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // Prisma 7: migration/introspection connection URLs live here, not in schema.prisma.
  datasource: {
    // Keep a sane dev default so `prisma generate` (and TypeScript builds) work even when DATABASE_URL is not set.
    // For actual migrations and runtime DB access, set DATABASE_URL explicitly.
    url: process.env.DATABASE_URL || 'postgresql://borgz:borgz@localhost:5432/borgz?schema=public',
  },
  migrations: {
    // Keep `npm run db:seed` consistent with Prisma migrate behavior.
    seed: 'ts-node prisma/seed.ts',
  },
});


