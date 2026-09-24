// The audit trail writer (FR-HIST-01, FR-HIST-02): rows are saved with the change they describe.
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { withTransaction } from '../../src/db/transaction.ts';
import {
  listTimeline,
  recordTransition,
  SYSTEM_ACTOR,
} from '../../src/modules/audit/audit.service.ts';
import { createPersonas, type Personas } from '../helpers/personas.ts';
import { insertRide } from '../helpers/records.ts';

let people: Personas;

beforeEach(async () => {
  people = await createPersonas();
});

describe('recording status changes', () => {
  it("keeps Nusrat's ride history in order, with who made each change", async () => {
    const rideId = await insertRide(people.nusrat.id);
    const nusrat = { role: 'PASSENGER' as const, userId: people.nusrat.id };

    await withTransaction(async (tx) => {
      await recordTransition(tx, {
        entityType: 'RIDE_REQUEST',
        entityId: rideId,
        fromStatus: null,
        toStatus: 'REQUESTED',
        actor: nusrat,
      });
      await recordTransition(tx, {
        entityType: 'RIDE_REQUEST',
        entityId: rideId,
        fromStatus: 'REQUESTED',
        toStatus: 'EXPIRED',
        actor: SYSTEM_ACTOR,
        reason: 'EXPIRED',
      });
    });

    const timeline = await listTimeline('RIDE_REQUEST', rideId);
    expect(timeline).toEqual([
      expect.objectContaining({ fromStatus: null, toStatus: 'REQUESTED', actorRole: 'PASSENGER' }),
      expect.objectContaining({ fromStatus: 'REQUESTED', toStatus: 'EXPIRED', reason: 'EXPIRED' }),
    ]);
  });

  it('saves no audit row when the change it belongs to fails', async () => {
    const rideId = await insertRide(people.nusrat.id);

    const attempt = withTransaction(async (tx) => {
      await recordTransition(tx, {
        entityType: 'RIDE_REQUEST',
        entityId: rideId,
        fromStatus: 'REQUESTED',
        toStatus: 'CANCELLED',
        actor: { role: 'PASSENGER', userId: people.nusrat.id },
      });
      throw new Error('the status update failed');
    });

    await expect(attempt).rejects.toThrow('the status update failed');
    expect(await prisma.statusHistory.count()).toBe(0);
  });
});
