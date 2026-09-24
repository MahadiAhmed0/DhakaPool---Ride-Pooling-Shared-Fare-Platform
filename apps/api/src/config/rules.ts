// Business rule values in one place (docs/CODING_CONVENTIONS.md §6).
// Tunable values come from environment variables; the defaults are the SRS values.
import { z } from 'zod';

const whole = z.coerce.number().int().nonnegative();

const tunableRules = z
  .object({
    FARE_BASE_PAISA: whole.default(3000), // BR-11: ৳30 base fare per seat
    FARE_PER_KM_PAISA: whole.default(1500), // BR-11: ৳15 per km
    FARE_POOL_DISCOUNT_BPS: whole.max(10000).default(2000), // BR-11: 20 % of the distance charge
    CANCELLATION_FEE_PAISA: whole.default(2000), // BR-07: ৳20 after the driver has arrived
    REQUEST_EXPIRY_MINUTES: whole.default(15), // A-13: unmatched requests expire
    POOL_JOIN_WINDOW_MINUTES: whole.default(10), // BR-02 (d): late joiners are not matched
    NO_SHOW_WAIT_MINUTES: whole.default(5), // FR-DRV-12: wait before marking a no-show
  })
  .parse(process.env);

export const BASE_FARE_PAISA = tunableRules.FARE_BASE_PAISA;
export const PER_KM_PAISA = tunableRules.FARE_PER_KM_PAISA;
export const POOL_DISCOUNT_BPS = tunableRules.FARE_POOL_DISCOUNT_BPS;
export const CANCELLATION_FEE_PAISA = tunableRules.CANCELLATION_FEE_PAISA;
export const REQUEST_EXPIRY_MINUTES = tunableRules.REQUEST_EXPIRY_MINUTES;
export const POOL_JOIN_WINDOW_MINUTES = tunableRules.POOL_JOIN_WINDOW_MINUTES;
export const NO_SHOW_WAIT_MINUTES = tunableRules.NO_SHOW_WAIT_MINUTES;

// Fixed rules (not tunable in the MVP).
export const TOP_UP_MIN_PAISA = 5_000; // BR-17: ৳50 minimum top-up
export const TOP_UP_MAX_PAISA = 500_000; // BR-17: ৳5,000 maximum top-up
export const MAX_SEATS_PER_REQUEST = 6; // FR-PAX-03 / ERD: seats 1–6, never above vehicle capacity
export const BASIS_POINTS_PER_WHOLE = 10_000; // 10,000 bps = 100 %
export const METRES_PER_KM = 1_000;
export const AUTH_ATTEMPTS_PER_MINUTE = 10; // NFR-SEC-07: sign-up and sign-in attempts per IP
