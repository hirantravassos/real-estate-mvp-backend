import { registerAs } from '@nestjs/config';

export interface DatabaseConfiguration {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly database: string;
}

export const databaseConfig = registerAs(
  'database',
  (): DatabaseConfiguration => ({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    username: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'real_estate_mvp',
  }),
);
