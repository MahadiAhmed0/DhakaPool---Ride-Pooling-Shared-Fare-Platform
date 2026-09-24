// BR-02: may a waiting request join a driver's OPEN pool? Pure: all the data is passed in, including
// a function that says whether two zones are neighbours (BR-08). Each "no" comes with a reason.
import type { Gender, GenderRestriction, PoolStatus } from '@dhakapool/shared';
import { fitsRestriction } from './pool-restriction.ts';

const MS_PER_MINUTE = 60_000;

export type MatchRequest = {
  pickupZoneCode: string;
  destinationZoneCode: string;
  seats: number;
  poolOptIn: boolean;
  sameGenderOnly: boolean;
  gender: Gender; // the requesting passenger's declared gender
  requestedAt: Date;
};

export type MatchMember = { destinationZoneCode: string; poolOptIn: boolean; gender: Gender };

export type MatchPool = {
  status: PoolStatus;
  pickupZoneCode: string;
  capacity: number;
  occupiedSeats: number;
  isPrivate: boolean;
  genderRestriction: GenderRestriction;
  createdAt: Date;
  members: MatchMember[]; // active members only
};

export type MatchRules = {
  joinWindowMinutes: number; // BR-02 (d)
  areNeighbours: (zoneCode: string, otherZoneCode: string) => boolean; // BR-08
};

export type MatchFailure =
  | 'POOL_NOT_OPEN'
  | 'NOT_OPTED_IN'
  | 'DIFFERENT_PICKUP'
  | 'NO_SEATS'
  | 'JOIN_WINDOW_PASSED'
  | 'DESTINATION_NOT_ADJACENT'
  | 'GENDER_RESTRICTED';

export type MatchResult = { ok: true } | { ok: false; reason: MatchFailure };

// BR-02 (c): every member goes to the same zone as the request, or to a neighbouring one.
function destinationsFit(request: MatchRequest, pool: MatchPool, rules: MatchRules): boolean {
  return pool.members.every(
    (member) =>
      member.destinationZoneCode === request.destinationZoneCode ||
      rules.areNeighbours(member.destinationZoneCode, request.destinationZoneCode),
  );
}

// BR-02 (d): the request was made at most 10 minutes after the pool was created.
function isWithinJoinWindow(request: MatchRequest, pool: MatchPool, rules: MatchRules): boolean {
  const windowEnd = pool.createdAt.getTime() + rules.joinWindowMinutes * MS_PER_MINUTE;
  return request.requestedAt.getTime() <= windowEnd;
}

// BR-18: (a) a restricted pool takes only riders of its gender; (b) a same-gender request joins
// only a pool whose members all share the requester's gender.
function gendersFit(request: MatchRequest, pool: MatchPool): boolean {
  if (!fitsRestriction(pool.genderRestriction, request.gender)) {
    return false;
  }
  return (
    !request.sameGenderOnly || pool.members.every((member) => member.gender === request.gender)
  );
}

// BR-02 (b): the request and every member opted in to sharing; a private pool takes nobody else.
function everyoneShares(request: MatchRequest, pool: MatchPool): boolean {
  return request.poolOptIn && !pool.isPrivate && pool.members.every((member) => member.poolOptIn);
}

// The checks run in this order, so the reason given is the most basic one that fails.
export function isCompatible(
  request: MatchRequest,
  pool: MatchPool,
  rules: MatchRules,
): MatchResult {
  const checks: [MatchFailure, () => boolean][] = [
    ['POOL_NOT_OPEN', () => pool.status === 'OPEN'], // FR-POOL-05
    ['NOT_OPTED_IN', () => everyoneShares(request, pool)],
    ['DIFFERENT_PICKUP', () => request.pickupZoneCode === pool.pickupZoneCode], // BR-02 (a)
    ['NO_SEATS', () => pool.occupiedSeats + request.seats <= pool.capacity], // BR-01
    ['JOIN_WINDOW_PASSED', () => isWithinJoinWindow(request, pool, rules)],
    ['DESTINATION_NOT_ADJACENT', () => destinationsFit(request, pool, rules)],
    ['GENDER_RESTRICTED', () => gendersFit(request, pool)],
  ];
  const failed = checks.find(([, passes]) => !passes());
  return failed ? { ok: false, reason: failed[0] } : { ok: true };
}
