import { Prisma } from '@prisma/client';

/**
 * Type guard for Prisma known request errors.
 * Use this in catch blocks instead of casting err to any.
 *
 * P2025 — Record not found (update/delete on non-existent row)
 * P2002 — Unique constraint violation
 * P2003 — Foreign key constraint violation
 */
export function isPrismaError(
  err: unknown,
  code: string,
): err is Prisma.PrismaClientKnownRequestError {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === code
  );
}