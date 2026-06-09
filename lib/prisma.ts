import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Prisma 7 ne lit plus l'URL depuis le schema : on passe un driver adapter
// au constructeur. Pour Neon (serverless/Vercel) on utilise le Pool WebSocket,
// qui supporte les transactions interactives.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaNeon({ connectionString });

// Singleton : en dev, le hot-reload de Next recrée le module à chaque édition.
// On stocke l'instance sur globalThis pour éviter d'ouvrir un pool par reload.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}