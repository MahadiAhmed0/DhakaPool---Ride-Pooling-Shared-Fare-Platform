// The database's own integrity rules (ERD §4.2) hold even when application code is bypassed.
// Covers TC-07 and the partial unique indexes behind BR-04, BR-05, FR-POOL-09 and FR-PAY-06.
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { mapDatabaseError } from '../../src/db/errors.ts';
import type { ErrorCode } from '../../src/domain/errors.ts';
import { createPersonas, type Personas } from '../helpers/personas.ts';
import { insertPool, insertRide } from '../helpers/records.ts';

let people: Personas;

beforeEach(async () => {
  people = await createPersonas();
});

// Runs a database action that must fail, and returns the API error code it maps to.
async function apiErrorCodeOf(action: Promise<unknown>): Promise<ErrorCode | undefined> {
  const error = await action.then(
    () => undefined,
    (caught: unknown) => caught,
  );
  expect(error, 'the database should have rejected this change').toBeDefined();
  return mapDatabaseError(error)?.code;
}

describe('seat capacity (TC-07, FR-POOL-02)', () => {
  it("rejects a fourth passenger in Bullet's 3-seat pool, even with direct database access", async () => {
    const poolId = await insertPool(people.jashim.id, people.jashim.vehicleId, {
      occupiedSeats: 3,
    });

    const code = await apiErrorCodeOf(
      prisma.pool.update({ where: { id: poolId }, data: { occupiedSeats: 4 } }),
    );

    expect(code).toBe('CAPACITY_EXCEEDED');
  });

  it('rejects the same over-booking when written as raw SQL', async () => {
    const poolId = await insertPool(people.jashim.id, people.jashim.vehicleId, {
      occupiedSeats: 3,
    });

    const code = await apiErrorCodeOf(
      prisma.$executeRaw`UPDATE pools SET occupied_seats = occupied_seats + 1 WHERE id = ${poolId}::uuid`,
    );

    expect(code).toBe('CAPACITY_EXCEEDED');
  });
});

describe('one active ride per passenger (BR-05)', () => {
  it('rejects a second active ride for Nusrat', async () => {
    await insertRide(people.nusrat.id);

    const code = await apiErrorCodeOf(insertRide(people.nusrat.id));

    expect(code).toBe('ACTIVE_REQUEST_EXISTS');
  });

  it('lets Nusrat request again once her earlier ride is completed', async () => {
    await insertRide(people.nusrat.id, { status: 'COMPLETED' });

    await expect(insertRide(people.nusrat.id)).resolves.toEqual(expect.any(String));
  });
});

describe('one active pool per driver (BR-04)', () => {
  it('rejects a second open pool for Jashim', async () => {
    await insertPool(people.jashim.id, people.jashim.vehicleId);

    const code = await apiErrorCodeOf(insertPool(people.jashim.id, people.jashim.vehicleId));

    expect(code).toBe('ACTIVE_POOL_EXISTS');
  });

  it('lets Jashim open a new pool after his last one is completed', async () => {
    await insertPool(people.jashim.id, people.jashim.vehicleId, { status: 'COMPLETED' });

    await expect(insertPool(people.jashim.id, people.jashim.vehicleId)).resolves.toEqual(
      expect.any(String),
    );
  });
});

describe('a ride is in at most one active pool (FR-POOL-09)', () => {
  it("rejects adding Rafiq's ride to Kamal's pool while it is still in Jashim's", async () => {
    const rideId = await insertRide(people.rafiq.id, {
      destinationZoneCode: 'GL1',
      status: 'MATCHED',
    });
    const jashimPool = await insertPool(people.jashim.id, people.jashim.vehicleId);
    const kamalPool = await insertPool(people.kamal.id, people.kamal.vehicleId);
    await prisma.poolMember.create({
      data: { poolId: jashimPool, rideRequestId: rideId, seats: 1 },
    });

    const code = await apiErrorCodeOf(
      prisma.poolMember.create({ data: { poolId: kamalPool, rideRequestId: rideId, seats: 1 } }),
    );

    expect(code).toBe('INVALID_STATE_TRANSITION');
  });

  it('allows the ride to join another pool after it has left the first one', async () => {
    const rideId = await insertRide(people.rafiq.id, { destinationZoneCode: 'GL1' });
    const jashimPool = await insertPool(people.jashim.id, people.jashim.vehicleId);
    const kamalPool = await insertPool(people.kamal.id, people.kamal.vehicleId);
    await prisma.poolMember.create({
      data: { poolId: jashimPool, rideRequestId: rideId, seats: 1, leftAt: new Date() },
    });

    await expect(
      prisma.poolMember.create({ data: { poolId: kamalPool, rideRequestId: rideId, seats: 1 } }),
    ).resolves.toBeDefined();
  });
});

describe('wallets and rides stay valid (FR-PAY-06, FR-PAX-11)', () => {
  it("never lets Shirin's TeslaPay balance go below zero", async () => {
    const code = await apiErrorCodeOf(
      prisma.wallet.update({ where: { id: people.shirin.walletId }, data: { balancePaisa: -1n } }),
    );

    expect(code).toBe('INSUFFICIENT_BALANCE');
  });

  it('rejects a same-gender ride that has not opted in to pooling', async () => {
    await expect(
      insertRide(people.shirin.id, { sameGenderOnly: true, poolOptIn: false }),
    ).rejects.toThrow(/ride_requests_same_gender_check/);
  });

  it('rejects a ride whose pickup and destination are the same zone', async () => {
    await expect(insertRide(people.nusrat.id, { destinationZoneCode: 'BAN' })).rejects.toThrow(
      /ride_requests_distinct_zones_check/,
    );
  });
});

describe('append-only records (FR-HIST-02, NFR-CON-05)', () => {
  it('refuses to change or delete an audit entry', async () => {
    const entry = await prisma.statusHistory.create({
      data: {
        entityType: 'POOL',
        entityId: people.jashim.id,
        toStatus: 'OPEN',
        actorRole: 'SYSTEM',
      },
    });

    await expect(
      prisma.statusHistory.update({ where: { id: entry.id }, data: { toStatus: 'CANCELLED' } }),
    ).rejects.toThrow(/append-only/);
    await expect(prisma.statusHistory.delete({ where: { id: entry.id } })).rejects.toThrow(
      /append-only/,
    );
  });

  it("refuses to rewrite Nusrat's wallet ledger", async () => {
    const [openingEntry] = await prisma.walletTransaction.findMany({
      where: { walletId: people.nusrat.walletId },
    });

    await expect(
      prisma.walletTransaction.update({
        where: { id: openingEntry!.id },
        data: { amountPaisa: 1n },
      }),
    ).rejects.toThrow(/append-only/);
  });
});
