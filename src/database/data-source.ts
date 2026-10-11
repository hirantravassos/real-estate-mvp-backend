import "reflect-metadata";
import { join } from "path";
import { DataSource } from "typeorm";
import { databaseConfig } from "../config/database.config";
import { buildDatabaseOptions } from "./database-options";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file, the variables come from the environment.
}

/** Used by the typeorm CLI only, the app builds its own in AppModule. */
export default new DataSource({
  ...buildDatabaseOptions(databaseConfig()),
  entities: [join(__dirname, "..", "**", "*.entity.js")],
  migrationsRun: false,
});
