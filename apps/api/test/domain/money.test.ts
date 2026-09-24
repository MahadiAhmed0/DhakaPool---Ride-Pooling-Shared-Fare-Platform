// Half-up rounding on whole numbers (BR-13), used by the fare formula.
import { describe, expect, it } from 'vitest';
import { roundHalfUpDiv } from '../../src/domain/money.ts';

describe('rounding half up to a whole paisa', () => {
  it('keeps exact results as they are', () => {
    expect(roundHalfUpDiv(4_500_000, 1_000)).toBe(4500);
    expect(roundHalfUpDiv(0, 1_000)).toBe(0);
  });

  it('rounds a half up', () => {
    expect(roundHalfUpDiv(7, 2)).toBe(4);
    expect(roundHalfUpDiv(3_499_500, 1_000)).toBe(3500);
  });

  it('rounds less than a half down and more than a half up', () => {
    expect(roundHalfUpDiv(5, 4)).toBe(1);
    expect(roundHalfUpDiv(7, 4)).toBe(2);
    expect(roundHalfUpDiv(1, 3)).toBe(0);
    expect(roundHalfUpDiv(2, 3)).toBe(1);
  });

  it('refuses fractions, negative amounts and dividing by zero', () => {
    expect(() => roundHalfUpDiv(2.5, 1)).toThrow(RangeError);
    expect(() => roundHalfUpDiv(-1, 2)).toThrow(RangeError);
    expect(() => roundHalfUpDiv(10, 0)).toThrow(RangeError);
  });
});
