// The fixed value lists used by both the API and the web app. They mirror the database enums (ERD §2).
// Each list is written once; its TypeScript type is derived from it, so the two can never disagree.

export const USER_ROLES = ['PASSENGER', 'DRIVER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const GENDERS = ['FEMALE', 'MALE', 'PREFER_NOT_TO_SAY'] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_RESTRICTIONS = ['NONE', 'FEMALE_ONLY', 'MALE_ONLY'] as const;
export type GenderRestriction = (typeof GENDER_RESTRICTIONS)[number];

export const DRIVER_AVAILABILITY = ['ONLINE', 'OFFLINE'] as const;
export type DriverAvailability = (typeof DRIVER_AVAILABILITY)[number];

export const RIDE_STATUSES = [
  'REQUESTED',
  'MATCHED',
  'DRIVER_ARRIVED',
  'STARTED',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
] as const;
export type RideStatus = (typeof RIDE_STATUSES)[number];

export const POOL_STATUSES = [
  'OPEN',
  'DRIVER_ARRIVED',
  'STARTED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type PoolStatus = (typeof POOL_STATUSES)[number];

export const PAYMENT_METHODS = ['CASH', 'TESLAPAY'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['PENDING_CASH', 'PAID', 'UNPAID'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const CHARGE_TYPES = ['RIDE', 'CANCELLATION_FEE'] as const;
export type ChargeType = (typeof CHARGE_TYPES)[number];

export const WALLET_TRANSACTION_TYPES = ['TOPUP', 'RIDE_PAYMENT', 'CANCELLATION_FEE'] as const;
export type WalletTransactionType = (typeof WALLET_TRANSACTION_TYPES)[number];

export const ACTOR_ROLES = ['PASSENGER', 'DRIVER', 'SYSTEM'] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];
