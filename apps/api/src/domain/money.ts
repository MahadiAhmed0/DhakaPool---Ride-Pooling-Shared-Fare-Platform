// Whole-number arithmetic for money (BR-13, BR-14). Amounts are integer paisa and no floating point
// is used, so every result is exact and can be checked by hand.

// Throws when a value is not a whole number of zero or more (for example 2.5 or -1).
export function assertWholeNumber(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a whole number of 0 or more, but was ${value}.`);
  }
}

// Divides and rounds half up to a whole number (BR-13): 7 ÷ 2 = 3.5 → 4, and 5 ÷ 4 = 1.25 → 1.
// The remainder decides the rounding, so the division itself never produces a fraction.
export function roundHalfUpDiv(numerator: number, denominator: number): number {
  assertWholeNumber(numerator, 'numerator');
  if (!Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new RangeError(`denominator must be a whole number above 0, but was ${denominator}.`);
  }
  const remainder = numerator % denominator;
  const quotient = (numerator - remainder) / denominator;
  const isHalfOrMore = remainder * 2 >= denominator;
  return isHalfOrMore ? quotient + 1 : quotient;
}
