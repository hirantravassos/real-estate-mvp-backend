import "dotenv/config";
import "reflect-metadata";
import { DataSource } from "typeorm";
import {
  databaseEntitiesPattern,
  databaseMigrationOptions,
} from "./database-migration.options";

function readRequiredEnvironmentVariable(
  name: string,
  allowEmpty = false,
): string {
  const value = process.env[name];

  if (value === undefined || (!allowEmpty && value.trim() === "")) {
    throw new Error(
      `Environment variable ${name} is required to run database commands. ` +
        "Refusing to fall back to a default so migrations never hit the wrong database.",
    );
  }

  return value;
}

/**
 * Data source used ONLY by the TypeORM CLI (migration:run, migration:generate, ...).
 * The application builds its own connection in AppModule with the same shared options.
 */
export default new DataSource({
  type: "mysql",
  host: readRequiredEnvironmentVariable("DATABASE_HOST"),
  port: parseInt(readRequiredEnvironmentVariable("DATABASE_PORT"), 10),
  username: readRequiredEnvironmentVariable("DATABASE_USERNAME"),
  password: readRequiredEnvironmentVariable("DATABASE_PASSWORD", true),
  database: readRequiredEnvironmentVariable("DATABASE_NAME"),
  entities: [databaseEntitiesPattern],
  logging: ["error", "migration"],
  ...databaseMigrationOptions,
});
