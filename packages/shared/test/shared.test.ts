// Money formatting (NFR-USA-04) and the sign-up / sign-in validation rules (FR-AUTH-01, FR-AUTH-02).
import { describe, expect, it } from 'vitest';
import { formatPaisa, logInSchema, signUpSchema } from '../src/index.ts';

describe('formatPaisa', () => {
  it("shows Nusrat's pooled fare of 6600 paisa as ৳66.00", () => {
    expect(formatPaisa(6600)).toBe('৳66.00');
  });

  it("shows Rafiq's solo fare of 6750 paisa as ৳67.50", () => {
    expect(formatPaisa(6750)).toBe('৳67.50');
  });

  it('adds thousands separators and keeps two decimals', () => {
    expect(formatPaisa(500_000)).toBe('৳5,000.00');
    expect(formatPaisa(5)).toBe('৳0.05');
  });

  it('marks negative amounts, such as a wallet debit', () => {
    expect(formatPaisa(-2000)).toBe('−৳20.00');
  });
});

describe('sign-up rules', () => {
  const shirin = {
    fullName: 'Shirin',
    email: 'Shirin@DhakaPool.test',
    phone: '+8801711000003',
    password: 'TeslaPool#2026',
  };

  it('stores the e-mail in lower case and defaults gender to "prefer not to say"', () => {
    expect(signUpSchema.parse(shirin)).toMatchObject({
      email: 'shirin@dhakapool.test',
      gender: 'PREFER_NOT_TO_SAY',
    });
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(signUpSchema.safeParse({ ...shirin, password: 'short' }).success).toBe(false);
  });

  it('rejects fields it does not know, such as a self-chosen role', () => {
    expect(signUpSchema.safeParse({ ...shirin, role: 'DRIVER' }).success).toBe(false);
  });

  it('accepts sign-in with either an e-mail or a phone number', () => {
    const byPhone = logInSchema.parse({ emailOrPhone: ' +8801711000003 ', password: 'x' });
    expect(byPhone.emailOrPhone).toBe('+8801711000003');
  });
});
