import { join } from "node:path";

export const MIGRATIONS_TABLE_NAME = "migrations";

/**
 * Connection options shared by the application and the TypeORM CLI data source.
 *
 * The schema is NEVER synchronized automatically. Every schema change must ship as a
 * reviewed migration, executed by the pre-deploy step (see docs/database-migrations.md).
 *
 * Migrations are loaded from compiled JavaScript, so the CLI must run against `dist`.
 */
export const databaseMigrationOptions = {
  synchronize: false,
  migrationsRun: false,
  migrations: [join(__dirname, "migrations", "*.js")],
  migrationsTableName: MIGRATIONS_TABLE_NAME,
  // MySQL commits DDL implicitly, so one migration must be recorded as soon as it succeeds.
  migrationsTransactionMode: "each" as const,
};

export const databaseEntitiesPattern = join(
  __dirname,
  "..",
  "..",
  "**",
  "*.entity.js",
);
