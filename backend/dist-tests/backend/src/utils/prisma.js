"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseUrl = getDatabaseUrl;
exports.getPrisma = getPrisma;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices
const globalForPrisma = global;
function getDatabaseUrl() {
    const url = process.env.DATABASE_URL;
    if (!url)
        throw new Error('DATABASE_URL is not set');
    return url;
}
/**
 * Lazy Prisma client initializer.
 * Important: do NOT create a PrismaClient at module import time; most of the backend is still in-memory and
 * should be able to run without DATABASE_URL when DB persistence is disabled.
 */
function getPrisma() {
    if (globalForPrisma.prisma)
        return globalForPrisma.prisma;
    const client = new client_1.PrismaClient({
        // Prisma 7 requires either a Driver Adapter or Accelerate.
        adapter: new adapter_pg_1.PrismaPg({ connectionString: getDatabaseUrl() }),
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    if (process.env.NODE_ENV !== 'production')
        globalForPrisma.prisma = client;
    return client;
}
