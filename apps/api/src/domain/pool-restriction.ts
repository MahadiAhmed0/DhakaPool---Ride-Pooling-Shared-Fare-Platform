// BR-18: the same-gender rule of a pool. A pool is FEMALE_ONLY or MALE_ONLY while any active member
// asked for a same-gender ride, and NONE otherwise. The driver's gender is never considered.
import type { Gender, GenderRestriction } from '@dhakapool/shared';

export type RestrictionMember = { sameGenderOnly: boolean; gender: Gender };

// Only passengers who declared FEMALE or MALE can ask for a same-gender ride (FR-PAX-11).
const RESTRICTION_FOR: Record<Gender, GenderRestriction> = {
  FEMALE: 'FEMALE_ONLY',
  MALE: 'MALE_ONLY',
  PREFER_NOT_TO_SAY: 'NONE',
};

// Worked out again whenever a member joins or leaves (FR-POOL-12).
export function genderRestriction(members: RestrictionMember[]): GenderRestriction {
  const requester = members.find((member) => member.sameGenderOnly);
  return requester ? RESTRICTION_FOR[requester.gender] : 'NONE';
}

// BR-18 (a): the gender a passenger needs to join a restricted pool.
export function fitsRestriction(restriction: GenderRestriction, gender: Gender): boolean {
  return restriction === 'NONE' || RESTRICTION_FOR[gender] === restriction;
}
