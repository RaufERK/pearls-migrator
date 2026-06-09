import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { resolve } from 'node:path';

import { PrismaClient } from '../generated/prisma/client';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
