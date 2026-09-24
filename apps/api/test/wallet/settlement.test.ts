// Paying for the ride at drop-off: TeslaPay (TC-26, FR-PAY-03), cash and its collection (TC-27,
// FR-PAY-04, FR-DRV-10), and the fall-back to cash when the balance is short (A-14, BR-15).
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { expectEveryLedgerToMatchItsBalance } from '../helpers/ledger.ts';
import { createPersonas, type Personas } from '../helpers/personas.ts';
import { accept, goOnline, NUSRATS_TRIP, RAFIQS_TRIP, requestRide } from '../helpers/trips.ts';

const app = createTestApp();
type Agent = Awaited<ReturnType<typeof signInAs>>;

let people: Personas;
let jashim: Agent;
let nusrat: Agent;
let rafiq: Agent;
let nusratsRide: string;
let rafiqsRide: string;
let poolId: string;

// Nusrat (TeslaPay) and Rafiq (cash) share Bullet, and the trip has started: 6600 and 6000.
beforeEach(async () => {
  people = await createPersonas();
  [jashim, nusrat, rafiq] = await Promise.all([
    signInAs(app, 'jashim@dhakapool.test'),
    signInAs(app, 'nusrat@dhakapool.test'),
    signInAs(app, 'rafiq@dhakapool.test'),
  ]);
  await goOnline(jashim);
  nusratsRide = await requestRide(nusrat, NUSRATS_TRIP);
  rafiqsRide = await requestRide(rafiq, RAFIQS_TRIP);
  await accept(jashim, nusratsRide);
  await accept(jashim, rafiqsRide);
  poolId = (await prisma.pool.findFirstOrThrow()).id;
  await jashim.post(`/api/pools/${poolId}/arrive`);
  await jashim.post(`/api/pools/${poolId}/start`);
});

async function dropOff(rideId: string): Promise<{ status: number; body: Record<string, never> }> {
  return jashim.post(`/api/pools/${poolId}/members/${rideId}/complete`);
}

describe('paying with TeslaPay (TC-26, FR-PAY-03)', () => {
  it('takes exactly 6600 from Nusrat at drop-off: ৳500.00 becomes ৳434.00', async () => {
    await dropOff(nusratsRide);

    const wallet = await nusrat.get('/api/wallet');
    const statement = await nusrat.get('/api/wallet/transactions');
    const ride = await nusrat.get(`/api/rides/${nusratsRide}`);

    expect(wallet.body.wallet.balancePaisa).toBe(43400);
    expect(statement.body.transactions[0]).toMatchObject({
      type: 'RIDE_PAYMENT',
      amountPaisa: -6600,
      balanceAfterPaisa: 43400,
      rideId: nusratsRide,
    });
    expect(ride.body.ride.payments).toEqual([
      { charge: 'RIDE', method: 'TESLAPAY', status: 'PAID', amountPaisa: 6600 },
    ]);
    await expectEveryLedgerToMatchItsBalance();
  });

  it('falls back to cash when Nusrat no longer has enough, and takes nothing from her wallet (A-14)', async () => {
    await prisma.$transaction([
      prisma.walletTransaction.create({
        data: {
          walletId: people.nusrat.walletId,
          type: 'RIDE_PAYMENT',
          amountPaisa: -45000n,
          balanceAfterPaisa: 5000n,
          reason: 'TEST_SPENT_ELSEWHERE',
        },
      }),
      prisma.wallet.update({
        where: { id: people.nusrat.walletId },
        data: { balancePaisa: 5000n },
      }),
    ]);

    const response = await dropOff(nusratsRide);

    expect(response.status).toBe(200);
    const ride = await nusrat.get(`/api/rides/${nusratsRide}`);
    expect(ride.body.ride.payments).toEqual([
      { charge: 'RIDE', method: 'CASH', status: 'PENDING_CASH', amountPaisa: 6600 },
    ]);
    const wallet = await nusrat.get('/api/wallet');
    expect(wallet.body.wallet.balancePaisa).toBe(5000);
    await expectEveryLedgerToMatchItsBalance();
  });
});

describe('money moving at the same moment (NFR-CON-05)', () => {
  it('keeps the ledger equal to the balance when Nusrat tops up while her fare is taken', async () => {
    const [droppedOff, toppedUp] = await Promise.all([
      dropOff(nusratsRide),
      nusrat.post('/api/wallet/topup').send({ amountPaisa: 10000 }),
    ]);

    expect(droppedOff.status).toBe(200);
    expect(toppedUp.status).toBe(200);
    const wallet = await nusrat.get('/api/wallet');
    expect(wallet.body.wallet.balancePaisa).toBe(50000 - 6600 + 10000);
    await expectEveryLedgerToMatchItsBalance();
  });
});

describe('paying in cash (TC-27, FR-PAY-04, FR-DRV-10)', () => {
  it('shows Rafiq "cash due" at drop-off and "paid" once Jashim has collected it', async () => {
    const afterDropOff = await dropOff(rafiqsRide);
    const due = await rafiq.get(`/api/rides/${rafiqsRide}`);

    const collected = await jashim.post(
      `/api/pools/${poolId}/members/${rafiqsRide}/cash-collected`,
    );
    const paid = await rafiq.get(`/api/rides/${rafiqsRide}`);

    expect(afterDropOff.status).toBe(200);
    expect(due.body.ride.payments).toEqual([
      { charge: 'RIDE', method: 'CASH', status: 'PENDING_CASH', amountPaisa: 6000 },
    ]);
    expect(collected.status).toBe(200);
    const rafiqInPool = collected.body.pool.members.find(
      (member: { passengerName: string }) => member.passengerName === 'Rafiq',
    );
    expect(rafiqInPool.paymentStatus).toBe('PAID');
    expect(paid.body.ride.payments[0].status).toBe('PAID');
    const payment = await prisma.payment.findFirstOrThrow({ where: { rideRequestId: rafiqsRide } });
    expect(payment.collectedById).toBe(people.jashim.id);
    const audit = await prisma.statusHistory.findFirstOrThrow({
      where: { entityType: 'PAYMENT', reason: 'CASH_COLLECTED' },
    });
    expect(audit).toMatchObject({
      fromStatus: 'PENDING_CASH',
      toStatus: 'PAID',
      actorRole: 'DRIVER',
    });
  });

  it('refuses to collect cash twice, or before the drop-off', async () => {
    const beforeDropOff = await jashim.post(
      `/api/pools/${poolId}/members/${rafiqsRide}/cash-collected`,
    );
    await dropOff(rafiqsRide);
    await jashim.post(`/api/pools/${poolId}/members/${rafiqsRide}/cash-collected`);
    const again = await jashim.post(`/api/pools/${poolId}/members/${rafiqsRide}/cash-collected`);

    expect(beforeDropOff.status).toBe(409);
    expect(again.status).toBe(409);
  });

  it('has nothing to collect from Nusrat, who paid with TeslaPay', async () => {
    await dropOff(nusratsRide);

    const response = await jashim.post(
      `/api/pools/${poolId}/members/${nusratsRide}/cash-collected`,
    );

    expect(response.status).toBe(409);
  });

  it("does not let Kamal mark Rafiq's cash as collected", async () => {
    await dropOff(rafiqsRide);
    const kamal = await signInAs(app, 'kamal@dhakapool.test');

    const response = await kamal.post(`/api/pools/${poolId}/members/${rafiqsRide}/cash-collected`);

    expect(response.status).toBe(404);
  });
});
