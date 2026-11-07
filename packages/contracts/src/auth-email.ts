import { z } from 'zod';

export const authEmailSchema = z.string().trim().toLowerCase().min(3).max(320).pipe(z.email());

export type AuthEmail = z.infer<typeof authEmailSchema>;

/** Matches `auth.email.otp_length` in supabase/config.toml. */
export const EMAIL_OTP_LENGTH = 6;

export const authEmailOtpSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${EMAIL_OTP_LENGTH}}$`));

export type AuthEmailOtp = z.infer<typeof authEmailOtpSchema>;
