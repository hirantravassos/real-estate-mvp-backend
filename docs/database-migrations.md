# Database migrations and safe deploys

The production database holds real customer data. The schema is changed **only** by reviewed
migrations. `synchronize` is off and must never be turned on.

## Why `synchronize` was removed

With `synchronize: true` the application rewrote the schema on every boot. When the type or the
length of a column changes, TypeORM does not alter it: it runs `DROP COLUMN` followed by `ADD COLUMN`
(`typeorm/driver/mysql/MysqlQueryRunner.js`, `changeColumn`). Every value in that column is lost.
This was reproduced in a lab: shrinking `customers.name` from 255 to 100 erased every customer name.

## How a deploy is protected

| Layer | What it does |
|---|---|
| Pre-deploy step | Railway runs `npm run db:migrate:deploy` after the build and before the new version gets traffic. A non zero exit stops the deployment and the current version keeps running. |
| Boot guard | `src/main.ts` refuses to start when migrations are pending. It only reads, it never changes the schema. |
| Healthcheck | `GET /health` runs `SELECT 1`. Railway only replaces the current version after it answers. |
| CI | Every pull request lints, builds, applies all migrations on an empty MySQL 8, applies them again (must be a no-op), checks that entities and migrations agree (`db:drift`), and blocks destructive SQL. |
| Migration review | `scripts/check-destructive-migrations.sh` fails when `up()` drops, renames, truncates, deletes or changes a column, unless the file has a `destructive-approved:` comment. |
| Strict CLI config | The CLI refuses to run without `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` and `DATABASE_NAME`. There are no silent defaults, so a missing variable can never point it at the wrong database. |

## Commands

| Command | Use |
|---|---|
| `npm run db:migrate` | Build and apply pending migrations (local development). |
| `npm run db:migrate:deploy` | Apply pending migrations from `dist` without building. Used by the pre-deploy step and CI. |
| `npm run db:migrate:status` | List migrations and whether they were executed. |
| `npm run db:migrate:generate -- src/infrastructure/database/migrations/<name>` | Generate a migration from entity changes. |
| `npm run db:migrate:revert` | Revert the last migration (never the baseline). |
| `npm run db:drift` | Exit code 1 when entities and the database differ. Read only. |
| `npm run db:migrations:review` | Block destructive SQL that has no approval. |

`db:migrate:deploy` and `db:drift` read compiled migrations from `dist`. With a stale `dist` the CLI
says `No migrations are pending` even when there are. Run `npm run build` first. CI and Railway do.

## Daily workflow

1. Change the entity.
2. Point `.env` at a **local** database and run `npm run db:migrate:generate -- src/infrastructure/database/migrations/<name>`.
3. Run `npm run lint` to format the generated file, then read the SQL.
4. Run `npm run db:migrate`, then `npm run db:drift`. It must print `No changes in database schema were found`.
5. Commit the entity change and the migration together.

Never point a local `.env` at the production database.

## Rules for production data

1. **Backward compatible first.** The pre-deploy step migrates before the old version stops, so the old
   code runs against the new schema for a short time. Add things in one release, remove them in a later one.
2. **Never change a column in place.** No type change, no length change, no rename. TypeORM generates
   `DROP` and `ADD`. Add a new column, copy the data (in the migration), deploy code that uses it, and
   only then drop the old column in a later migration.
3. **New `NOT NULL` columns on existing tables need a `DEFAULT`.**
4. **One concern per migration, and make it re-runnable.** MySQL commits DDL implicitly, so a failed
   migration is not rolled back. Guard with `queryRunner.hasTable` and `queryRunner.hasColumn`.
5. **Destructive SQL needs approval.** Take a backup, describe the plan in the pull request, and add
   `// destructive-approved: <why it is safe, who reviewed it>` to the migration.
6. **Never edit a migration that was merged.** Add a new one.

## First rollout (baseline)

The baseline migration `*-baseline-schema.ts` describes the schema production already has (release
1.0.4). On an empty database it creates everything. On a database that already has all nine tables it
changes nothing and is only recorded in the `migrations` table. On a partial schema it aborts.

Do this once, in order:

1. Take a backup of the production database.
2. Restore it into a separate database and run `npm run db:drift` against that copy.
   Expected: `No changes in database schema were found`. Any generated SQL means production differs
   from the code. **Stop** and fix the difference deliberately before continuing.
3. Run `npm run db:migrate:deploy` against the copy. Expected log: `Baseline: schema already present`.
4. In Railway, open the service settings and confirm **Pre-deploy Command** is
   `npm run db:migrate:deploy` and the healthcheck path is `/health`. `railway.toml` sets both,
   but do not rely on the file alone: confirm the values in the dashboard, because a pre-deploy
   command that silently does not run is exactly the failure this setup exists to prevent. The boot
   guard still stops a version that is ahead of the schema.
5. Deploy. Confirm the pre-deploy log shows the baseline line and `SELECT * FROM migrations` has one row.

## Rollback

- Application: redeploy the previous version. This is safe as long as every migration followed rule 1.
- Database: `db:migrate:revert` undoes only the last migration and the baseline cannot be reverted.
  If data was lost, restore the backup taken before the deploy.

## Known leftovers (decide before changing)

- `whatsapp_chats` and `whatsapp_status` still exist in production without an entity. They hold personal
  data. Dropping them needs a backup and an explicit decision, so the baseline ignores them.
- `properties.infoSquareMeters` and `properties.infoBeachProximityInKm` are `decimal(10,0)`, because
  `numeric` without precision is an integer in MySQL. Fractions were already rounded. Widening them
  needs its own tested migration.
