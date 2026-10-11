import { join } from "path";
import type { DataSourceOptions } from "typeorm";

export interface DatabaseConnection {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

/**
 * Shared by the app and the typeorm CLI. The schema only changes through
 * migrations, run on boot before the app starts listening.
 */
export const buildDatabaseOptions = (
  connection: DatabaseConnection,
): DataSourceOptions => ({
  type: "mysql",
  ...connection,
  synchronize: false,
  migrations: [join(__dirname, "migrations", "*.js")],
  migrationsRun: true,
  migrationsTransactionMode: "each",
  logging: ["migration"],
});
