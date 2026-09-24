// The matching rule (TC-20; BR-02, BR-08) and the same-gender rule (BR-18), with no database.
// Bullet's pool starts from Banani with Nusrat going to Mohakhali.
import { describe, expect, it } from 'vitest';
import { ADJACENT_PAIRS } from '../../prisma/seed-data/zones.ts';
import {
  isCompatible,
  type MatchPool,
  type MatchRequest,
  type MatchRules,
} from '../../src/domain/matching.ts';
import { genderRestriction } from '../../src/domain/pool-restriction.ts';

const MINUTE_MS = 60 * 1000;
const poolCreatedAt = new Date('2026-09-24T09:00:00Z');

// The seeded neighbour list (SRS §13.3), in both directions.
const neighbours = new Set(ADJACENT_PAIRS.flatMap(([a, b]) => [`${a}-${b}`, `${b}-${a}`]));
const rules: MatchRules = {
  joinWindowMinutes: 10,
  areNeighbours: (zone, otherZone) => neighbours.has(`${zone}-${otherZone}`),
};

const nusratsPool: MatchPool = {
  status: 'OPEN',
  pickupZoneCode: 'BAN',
  capacity: 3,
  occupiedSeats: 1,
  isPrivate: false,
  genderRestriction: 'NONE',
  createdAt: poolCreatedAt,
  members: [{ destinationZoneCode: 'MHK', poolOptIn: true, gender: 'FEMALE' }],
};

// Rafiq: Banani → Gulshan 1, 1 seat, sharing on, two minutes after the pool was formed.
const rafiq: MatchRequest = {
  pickupZoneCode: 'BAN',
  destinationZoneCode: 'GL1',
  seats: 1,
  poolOptIn: true,
  sameGenderOnly: false,
  gender: 'MALE',
  requestedAt: new Date(poolCreatedAt.getTime() + 2 * MINUTE_MS),
};

function reasonFor(request: MatchRequest, pool: MatchPool = nusratsPool): string {
  const result = isCompatible(request, pool, rules);
  return result.ok ? 'COMPATIBLE' : result.reason;
}

describe('who may join Nusrat in Bullet (TC-20, BR-02)', () => {
  it('accepts Rafiq to Gulshan 1, a neighbour of Mohakhali', () => {
    expect(reasonFor(rafiq)).toBe('COMPATIBLE');
  });

  it('accepts Shirin to Tejgaon, also a neighbour of Mohakhali', () => {
    expect(reasonFor({ ...rafiq, destinationZoneCode: 'TEJ', gender: 'FEMALE' })).toBe(
      'COMPATIBLE',
    );
  });

  it('refuses a rider to Uttara, which is nowhere near Mohakhali', () => {
    expect(reasonFor({ ...rafiq, destinationZoneCode: 'UTR' })).toBe('DESTINATION_NOT_ADJACENT');
  });

  it('refuses a rider waiting in Gulshan 1 instead of Banani', () => {
    expect(reasonFor({ ...rafiq, pickupZoneCode: 'GL1', destinationZoneCode: 'MHK' })).toBe(
      'DIFFERENT_PICKUP',
    );
  });

  it('refuses Rafiq when he switched sharing off', () => {
    expect(reasonFor({ ...rafiq, poolOptIn: false })).toBe('NOT_OPTED_IN');
  });

  it('refuses a request made 11 minutes after the pool formed, but not one at 10 minutes', () => {
    const at = (minutes: number): Date => new Date(poolCreatedAt.getTime() + minutes * MINUTE_MS);

    expect(reasonFor({ ...rafiq, requestedAt: at(11) })).toBe('JOIN_WINDOW_PASSED');
    expect(reasonFor({ ...rafiq, requestedAt: at(10) })).toBe('COMPATIBLE');
  });

  it('refuses anyone when Nusrat rides privately', () => {
    expect(reasonFor(rafiq, { ...nusratsPool, isPrivate: true })).toBe('NOT_OPTED_IN');
  });

  it('refuses a 3-seat request when only 2 of Bullet’s seats are free (BR-01)', () => {
    expect(reasonFor({ ...rafiq, seats: 3 })).toBe('NO_SEATS');
    expect(reasonFor({ ...rafiq, seats: 2 })).toBe('COMPATIBLE');
  });

  it('refuses anyone once Jashim has arrived at the pickup (FR-POOL-05)', () => {
    expect(reasonFor(rafiq, { ...nusratsPool, status: 'DRIVER_ARRIVED' })).toBe('POOL_NOT_OPEN');
  });
});

describe('same-gender rides (BR-18)', () => {
  const womenOnlyPool: MatchPool = { ...nusratsPool, genderRestriction: 'FEMALE_ONLY' };

  it('refuses Rafiq in a women-only pool and accepts Nusrat (TC-47)', () => {
    expect(reasonFor(rafiq, womenOnlyPool)).toBe('GENDER_RESTRICTED');
    expect(
      reasonFor({ ...rafiq, gender: 'FEMALE', destinationZoneCode: 'MHK' }, womenOnlyPool),
    ).toBe('COMPATIBLE');
  });

  it('refuses a passenger who preferred not to say their gender in a women-only pool (TC-48)', () => {
    expect(reasonFor({ ...rafiq, gender: 'PREFER_NOT_TO_SAY' }, womenOnlyPool)).toBe(
      'GENDER_RESTRICTED',
    );
  });

  it("refuses Shirin's same-gender request when Rafiq is already in the pool (TC-48)", () => {
    const poolWithRafiq: MatchPool = {
      ...nusratsPool,
      members: [{ destinationZoneCode: 'GL1', poolOptIn: true, gender: 'MALE' }],
    };
    const shirin: MatchRequest = {
      ...rafiq,
      destinationZoneCode: 'TEJ',
      gender: 'FEMALE',
      sameGenderOnly: true,
    };

    expect(reasonFor(shirin, poolWithRafiq)).toBe('GENDER_RESTRICTED');
    expect(reasonFor(shirin)).toBe('COMPATIBLE'); // Nusrat is a woman, so Shirin may join her
  });

  it('makes a pool women-only while Shirin, who asked for it, is a member (FR-POOL-12)', () => {
    const nusrat = { sameGenderOnly: false, gender: 'FEMALE' as const };
    const shirin = { sameGenderOnly: true, gender: 'FEMALE' as const };
    const rafiqAsMember = { sameGenderOnly: true, gender: 'MALE' as const };

    expect(genderRestriction([nusrat, shirin])).toBe('FEMALE_ONLY');
    expect(genderRestriction([nusrat])).toBe('NONE');
    expect(genderRestriction([rafiqAsMember])).toBe('MALE_ONLY');
  });
});
