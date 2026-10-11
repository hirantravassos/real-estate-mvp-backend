# Database migrations

The schema only changes through the migrations in `migrations/`. `synchronize`
is off everywhere, and the app runs pending migrations on boot, before it
starts listening.

| Migration | What it does |
| --- | --- |
| `Baseline` | Schema of release 1.0.4. Skipped on databases that already have it (production), creates everything on an empty one. Cannot be reverted. |
| `Release2Schema` | Everything 2.0.0 adds: 19 tables, 10 nullable columns, 29 foreign keys and new values on `documents.ownerType`. Nothing is dropped or rewritten, and every step checks first, so it can run again after stopping halfway. |

## Commands

All of them build first and read the connection from `.env`.

```bash
npm run migration:show                                   # applied and pending
npm run migration:run
npm run migration:revert                                 # last one only
npm run schema:log                                       # what still differs from the entities, should be empty
npm run migration:generate -- src/database/migrations/AddSomething
```

## Changing an entity

1. Change the entity.
2. `npm run migration:generate -- src/database/migrations/<Name>` against a database already up to date with the migrations.
3. Read the generated SQL. A `DROP COLUMN` followed by `ADD` (a rename or a type change) loses the column data, write it by hand with `CHANGE` or a copy instead.
4. Commit the migration with the entity.

## Upgrading production from 1.0.4

1. Backup the database.
2. Optional rehearsal: restore the backup on a local MySQL, point `.env` at it and run `npm run migration:run` then `npm run schema:log`, it should end with "Your schema is up to date".
3. Deploy. The first boot creates the `migrations` table, records `Baseline` and runs `Release2Schema`.

Rolling back to 1.0.4 is not just a redeploy: 1.0.4 still has `synchronize` on and drops every 2.0.0 table and column on boot. Run `npm run migration:revert` first (it refuses while documents use the new owner types) or restore the backup.

## A local database that drifted

A database built by `synchronize` on other branches may have tables or columns no migration knows. Restore a production backup (or start empty) and run the migrations, `npm run schema:log` shows what still differs.
