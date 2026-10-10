import { DataSource, MigrationExecutor } from "typeorm";
import { MIGRATIONS_TABLE_NAME } from "./database-migration.options";

/**
 * Fails fast when the code is about to run against a schema that is behind it.
 *
 * Read only: it never creates the migrations table nor touches the schema, so booting
 * the application can never change production data structures.
 */
export async function findPendingMigrationNames(
  dataSource: DataSource,
): Promise<string[]> {
  const queryRunner = dataSource.createQueryRunner();

  try {
    const hasMigrationsTable = await queryRunner.hasTable(
      MIGRATIONS_TABLE_NAME,
    );

    if (!hasMigrationsTable) {
      return dataSource.migrations.map(
        (migration) => migration.name ?? migration.constructor.name,
      );
    }
  } finally {
    await queryRunner.release();
  }

  const pendingMigrations = await new MigrationExecutor(
    dataSource,
  ).getPendingMigrations();

  return pendingMigrations.map((migration) => migration.name);
}

export async function assertNoPendingMigrations(
  dataSource: DataSource,
): Promise<void> {
  const pendingMigrationNames = await findPendingMigrationNames(dataSource);

  if (pendingMigrationNames.length === 0) {
    return;
  }

  throw new Error(
    `Refusing to start: ${pendingMigrationNames.length} pending database migration(s): ` +
      `${pendingMigrationNames.join(", ")}. ` +
      "Run `npm run db:migrate:deploy` (the pre-deploy step) before starting this version.",
  );
}
