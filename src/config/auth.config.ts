import { registerAs } from '@nestjs/config';

export interface AuthConfiguration {
  readonly jwtSecret: string;
  readonly jwtExpirationTime: number;
  readonly mfaTokenExpirationMinutes: number;
  readonly mfaTokenLength: number;
}

export const authConfig = registerAs(
  'auth',
  (): AuthConfiguration => ({
    jwtSecret: process.env.JWT_SECRET || 'change-me-to-a-secure-secret',
    jwtExpirationTime: parseInt(process.env.JWT_EXPIRATION_TIME || '3600', 10),
    mfaTokenExpirationMinutes: parseInt(
      process.env.MFA_TOKEN_EXPIRATION_MINUTES || '5',
      10,
    ),
    mfaTokenLength: parseInt(process.env.MFA_TOKEN_LENGTH || '6', 10),
  }),
);
