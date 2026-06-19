import { PrismaClient } from "@/app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const log =
  process.env.NODE_ENV === "development"
    ? ["error" as const, "warn" as const]
    : ["error" as const];

function buildClient(): PrismaClient {
  // Neon serverless adapter (Vercel/Neon): set PRISMA_DRIVER_ADAPTER=neon.
  // Standard Postgres (Docker/VPS): leave unset — plain PrismaClient, no adapter.
  if (process.env.PRISMA_DRIVER_ADAPTER === "neon") {
    const { PrismaNeon } = require("@prisma/adapter-neon");
    return new PrismaClient({ adapter: new PrismaNeon({ connectionString }), log });
  }
  const { Pool } = require("pg");
  const { PrismaPg } = require("@prisma/adapter-pg");
  return new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString })), log });
}

// Singleton: in dev, Next's hot-reload recreates the module on every edit.
// We store the instance on globalThis to avoid opening a pool per reload.
export const prisma = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}