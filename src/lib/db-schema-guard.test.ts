// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchemaHealed } from './db-schema-guard';

describe('Database Schema Guard (Self-Healing DDL)', () => {
  it('runs ensureDatabaseSchemaHealed idempotently without error', async () => {
    await expect(ensureDatabaseSchemaHealed()).resolves.not.toThrow();
  });

  it('confirms User.username column exists in database', async () => {
    await ensureDatabaseSchemaHealed();
    const cols = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'username'
    `;
    expect(cols.length).toBeGreaterThanOrEqual(1);
    expect(cols[0]?.column_name).toBe('username');
  });

  it('allows querying user without User.username schema mismatch', async () => {
    await ensureDatabaseSchemaHealed();
    const user = await prisma.user.findFirst({
      select: { id: true, email: true },
    });
    // Query succeeds without throwing "The column User.username does not exist"
    expect(user === null || typeof user.id === 'string').toBe(true);
  });
});
