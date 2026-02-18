import { registerAs } from '@nestjs/config';

export interface MailConfiguration {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
  readonly from: string;
}

export const mailConfig = registerAs(
  'mail',
  (): MailConfiguration => ({
    host: process.env.MAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    user: process.env.MAIL_USER || '',
    password: process.env.MAIL_PASSWORD || '',
    from: process.env.MAIL_FROM || 'noreply@example.com',
  }),
);
