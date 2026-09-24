// Cancellation fees are recorded and charged (TC-14; BR-07, FR-FARE-05, FR-PAY-05): taken from
// TeslaPay, or left UNPAID for cash rides and short balances.
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

// Nusrat (TeslaPay) and Rafiq (cash) are in Bullet's pool and Jashim has arrived.
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
});

describe('cancelling after Jashim arrived (TC-14)', () => {
  it('takes ৳20.00 from Nusrat’s TeslaPay, with a CANCELLATION_FEE ledger entry', async () => {
    const response = await nusrat.post(`/api/rides/${nusratsRide}/cancel`);

    expect(response.body.ride.payments).toEqual([
      { charge: 'CANCELLATION_FEE', method: 'TESLAPAY', status: 'PAID', amountPaisa: 2000 },
    ]);
    const statement = await nusrat.get('/api/wallet/transactions');
    expect(statement.body.transactions[0]).toMatchObject({
      type: 'CANCELLATION_FEE',
      amountPaisa: -2000,
      balanceAfterPaisa: 48000,
      rideId: nusratsRide,
    });
    await expectEveryLedgerToMatchItsBalance();
  });

  it('records Rafiq’s ৳20.00 fee as UNPAID, because he pays cash', async () => {
    const response = await rafiq.post(`/api/rides/${rafiqsRide}/cancel`);

    expect(response.body.ride.fare.cancellationFeePaisa).toBe(2000);
    expect(response.body.ride.payments).toEqual([
      { charge: 'CANCELLATION_FEE', method: 'CASH', status: 'UNPAID', amountPaisa: 2000 },
    ]);
    expect(await prisma.walletTransaction.count({ where: { rideRequestId: rafiqsRide } })).toBe(0);
  });

  it('leaves the fee UNPAID when Nusrat’s balance cannot cover it, and never goes negative', async () => {
    await prisma.$transaction([
      prisma.walletTransaction.create({
        data: {
          walletId: people.nusrat.walletId,
          type: 'RIDE_PAYMENT',
          amountPaisa: -49000n,
          balanceAfterPaisa: 1000n,
          reason: 'TEST_SPENT_ELSEWHERE',
        },
      }),
      prisma.wallet.update({
        where: { id: people.nusrat.walletId },
        data: { balancePaisa: 1000n },
      }),
    ]);

    const response = await nusrat.post(`/api/rides/${nusratsRide}/cancel`);

    expect(response.status).toBe(200);
    expect(response.body.ride.payments[0]).toMatchObject({ method: 'TESLAPAY', status: 'UNPAID' });
    const wallet = await nusrat.get('/api/wallet');
    expect(wallet.body.wallet.balancePaisa).toBe(1000);
    await expectEveryLedgerToMatchItsBalance();
  });
});

describe('a no-show (FR-DRV-12)', () => {
  it('charges Nusrat the fee from TeslaPay when Jashim marks her as a no-show', async () => {
    await prisma.pool.update({
      where: { id: poolId },
      data: { arrivedAt: new Date(Date.now() - 6 * 60 * 1000) },
    });

    await jashim.post(`/api/pools/${poolId}/members/${nusratsRide}/no-show`);

    const wallet = await nusrat.get('/api/wallet');
    expect(wallet.body.wallet.balancePaisa).toBe(48000);
    const payment = await prisma.payment.findFirstOrThrow({
      where: { rideRequestId: nusratsRide },
    });
    expect(payment).toMatchObject({ method: 'TESLAPAY', status: 'PAID', amountPaisa: 2000n });
    await expectEveryLedgerToMatchItsBalance();
  });
});

describe('cancelling before Jashim arrived costs nothing', () => {
  it('charges Nusrat nothing if she cancels while only MATCHED', async () => {
    await jashim.post(`/api/pools/${poolId}/cancel`); // back to REQUESTED
    await accept(jashim, nusratsRide); // MATCHED again, in a new pool

    const response = await nusrat.post(`/api/rides/${nusratsRide}/cancel`);

    expect(response.body.ride.payments).toEqual([]);
    const wallet = await nusrat.get('/api/wallet');
    expect(wallet.body.wallet.balancePaisa).toBe(50000);
  });
});
