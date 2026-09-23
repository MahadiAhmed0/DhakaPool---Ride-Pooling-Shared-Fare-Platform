// Transactions and row locks (NFR-CON-02, ADR-0006): all-or-nothing saves and waiting on a locked row.
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { lockDriver, lockPool } from '../../src/db/lock.ts';
import { withTransaction } from '../../src/db/transaction.ts';
import { createPersonas, type Personas } from '../helpers/personas.ts';
import { insertPool } from '../helpers/records.ts';

let people: Personas;

beforeEach(async () => {
  people = await createPersonas();
});

describe('withTransaction', () => {
  it('fails fast on a stuck lock: lock_timeout is 3 s inside every transaction', async () => {
    const [setting] = await withTransaction(
      (tx) => tx.$queryRaw<{ lock_timeout: string }[]>`SHOW lock_timeout`,
    );

    expect(setting!.lock_timeout).toBe('3s');
  });

  it('saves nothing when any step fails', async () => {
    const attempt = withTransaction(async (tx) => {
      await tx.pool.create({
        data: {
          driverId: people.jashim.id,
          vehicleId: people.jashim.vehicleId,
          pickupZoneCode: 'BAN',
          capacity: 3,
        },
      });
      throw new Error('a later step failed');
    });

    await expect(attempt).rejects.toThrow('a later step failed');
    expect(await prisma.pool.count()).toBe(0);
  });
});

describe('row locks', () => {
  it("reports whether the row exists: Jashim's driver row yes, an unknown pool no", async () => {
    const results = await withTransaction(async (tx) => ({
      jashim: await lockDriver(tx, people.jashim.id),
      unknownPool: await lockPool(tx, '00000000-0000-0000-0000-000000000000'),
    }));

    expect(results).toEqual({ jashim: true, unknownPool: false });
  });

  it("makes a second transaction wait until the first one releases Bullet's pool", async () => {
    const poolId = await insertPool(people.jashim.id, people.jashim.vehicleId);
    const holdLockMs = 400;
    const events: string[] = [];

    const first = withTransaction(async (tx) => {
      await lockPool(tx, poolId);
      events.push('first locked');
      await new Promise((resolve) => setTimeout(resolve, holdLockMs));
      events.push('first done');
    });
    // Give the first transaction a head start so it takes the lock first.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const second = withTransaction(async (tx) => {
      await lockPool(tx, poolId);
      events.push('second locked');
    });
    await Promise.all([first, second]);

    expect(events).toEqual(['first locked', 'first done', 'second locked']);
  });
});
