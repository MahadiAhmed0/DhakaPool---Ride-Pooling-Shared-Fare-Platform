// Sign-up and sign-in: the validation rules (FR-AUTH-01, FR-AUTH-02) and the signed-in user's shape.
// The API validates every request with these schemas; the web app uses the same ones for its forms.
import { z } from 'zod';
import { GENDERS, type Gender, type UserRole } from './enums.ts';

export const PASSWORD_MIN_LENGTH = 8; // FR-AUTH-01
export const PASSWORD_MAX_LENGTH = 72; // bcrypt only uses the first 72 bytes of a password
const FULL_NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;

// A Bangladeshi or international phone number: an optional "+" followed by 10–15 digits.
const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;

export const signUpSchema = z.strictObject({
  fullName: z.string().trim().min(2, 'Please enter your name.').max(FULL_NAME_MAX_LENGTH),
  email: z
    .email('Please enter a valid e-mail address.')
    .max(EMAIL_MAX_LENGTH)
    .transform((email) => email.toLowerCase()),
  phone: z.string().trim().regex(PHONE_PATTERN, 'Please enter a valid phone number.'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `The password needs at least ${PASSWORD_MIN_LENGTH} characters.`)
    .max(PASSWORD_MAX_LENGTH),
  // Optional and used only for same-gender rides (FR-PAX-11, A-19).
  gender: z.enum(GENDERS).default('PREFER_NOT_TO_SAY'),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const logInSchema = z.strictObject({
  emailOrPhone: z.string().trim().min(1, 'Please enter your e-mail or phone number.'),
  password: z.string().min(1, 'Please enter your password.').max(PASSWORD_MAX_LENGTH),
});
export type LogInInput = z.infer<typeof logInSchema>;

// The signed-in user as returned by the API. Gender is shown only to the user themself (A-20).
export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  gender: Gender;
  // Drivers only (FR-DRV-01).
  vehicle?: { name: string; plate: string; capacity: number };
};
