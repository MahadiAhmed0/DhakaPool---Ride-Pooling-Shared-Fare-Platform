// The TeslaPay wallet: balance and statement (FR-PAY-01) and simulated top-ups (TC-29, FR-PAY-02).
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/db/client.ts';
import { createTestApp, signInAs } from '../helpers/app.ts';
import { expectEveryLedgerToMatchItsBalance } from '../helpers/ledger.ts';
import { createPersonas, type Personas } from '../helpers/personas.ts';
import { SHIRINS_TRIP } from '../helpers/trips.ts';

const app = createTestApp();
type Agent = Awaited<ReturnType<typeof signInAs>>;

let people: Personas;
let nusrat: Agent;

beforeEach(async () => {
  people = await createPersonas();
  nusrat = await signInAs(app, 'nusrat@dhakapool.test');
});

describe("Nusrat's wallet (FR-PAY-01)", () => {
  it('shows her seeded ৳500.00 and the opening entry in her statement', async () => {
    const wallet = await nusrat.get('/api/wallet');
    const statement = await nusrat.get('/api/wallet/transactions');

    expect(wallet.body.wallet).toEqual({ balancePaisa: 50000 });
    expect(statement.body.transactions).toEqual([
      expect.objectContaining({
        type: 'TOPUP',
        amountPaisa: 50000,
        balanceAfterPaisa: 50000,
        reason: 'SEED',
      }),
    ]);
    expect(statement.body.nextCursor).toBeNull();
  });

  it('shows Rafiq, who pays cash, an empty wallet', async () => {
    const rafiq = await signInAs(app, 'rafiq@dhakapool.test');

    const wallet = await rafiq.get('/api/wallet');
    const statement = await rafiq.get('/api/wallet/transactions');

    expect(wallet.body.wallet.balancePaisa).toBe(0);
    expect(statement.body.transactions).toEqual([]);
  });

  it('is only for passengers, so Jashim gets 403', async () => {
    const jashim = await signInAs(app, 'jashim@dhakapool.test');

    const response = await jashim.get('/api/wallet');

    expect(response.status).toBe(403);
  });
});

describe('topping up (TC-29, BR-17)', () => {
  it('credits ৳500.00 at once with a TOPUP entry, newest first in the statement', async () => {
    const response = await nusrat.post('/api/wallet/topup').send({ amountPaisa: 50000 });
    const statement = await nusrat.get('/api/wallet/transactions');

    expect(response.status).toBe(200);
    expect(response.body.wallet.balancePaisa).toBe(100000);
    expect(statement.body.transactions[0]).toMatchObject({
      type: 'TOPUP',
      amountPaisa: 50000,
      balanceAfterPaisa: 100000,
    });
    await expectEveryLedgerToMatchItsBalance();
  });

  it.each([
    ['৳10.00, below the ৳50 minimum', 1000],
    ['৳6,000.00, above the ৳5,000 maximum', 600000],
    ['half a paisa', 5000.5],
  ])('refuses %s with 400', async (_case, amountPaisa) => {
    const response = await nusrat.post('/api/wallet/topup').send({ amountPaisa });

    expect(response.status).toBe(400);
    expect(response.body.error.details.fields).toEqual([
      expect.objectContaining({ path: 'amountPaisa' }),
    ]);
    const wallet = await nusrat.get('/api/wallet');
    expect(wallet.body.wallet.balancePaisa).toBe(50000);
  });

  it('keeps every ledger equal to its balance when Nusrat tops up five times at once', async () => {
    const topUps = Array.from({ length: 5 }, () =>
      nusrat.post('/api/wallet/topup').send({ amountPaisa: 10000 }),
    );

    const responses = await Promise.all(topUps);

    expect(responses.every((response) => response.status === 200)).toBe(true);
    const wallet = await nusrat.get('/api/wallet');
    expect(wallet.body.wallet.balancePaisa).toBe(100000);
    await expectEveryLedgerToMatchItsBalance();
  });
});

describe('a balance too low for the trip (TC-28, FR-PAX-05)', () => {
  it('refuses Shirin with ৳50.00 left a TeslaPay ride that costs ৳105.00, and creates no ride', async () => {
    await prisma.$transaction([
      prisma.walletTransaction.create({
        data: {
          walletId: people.shirin.walletId,
          type: 'RIDE_PAYMENT',
          amountPaisa: -15000n,
          balanceAfterPaisa: 5000n,
          reason: 'TEST_SPENT_ELSEWHERE',
        },
      }),
      prisma.wallet.update({
        where: { id: people.shirin.walletId },
        data: { balancePaisa: 5000n },
      }),
    ]);
    const shirin = await signInAs(app, 'shirin@dhakapool.test');

    const response = await shirin.post('/api/rides').send(SHIRINS_TRIP);

    expect(response.status).toBe(422);
    expect(response.body.error).toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
      details: { balancePaisa: 5000, requiredPaisa: 10500 },
    });
    expect(await prisma.rideRequest.count()).toBe(0);
  });
});
