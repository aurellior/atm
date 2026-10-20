import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Converts BigInt fields in Prisma results to strings for safe JSON serialization
 */
export function serializeData<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export function isLocalDatabaseConfigured(): boolean {
  const dbUrl = process.env.DATABASE_URL?.trim();
  return Boolean(dbUrl && dbUrl.length > 0);
}
