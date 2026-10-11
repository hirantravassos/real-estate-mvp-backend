# Database migrations

The schema only changes through the migrations in `migrations/`. `synchronize`
is off everywhere, and the app runs pending migrations on boot, before it
starts listening.

| Migration        | What it does                                                                                                                                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Baseline`       | Schema of release 1.0.4. Skipped on databases that already have it (production), creates everything on an empty one. Cannot be reverted.                                                                                                                                                                     |
| `Release2Schema` | Everything 2.0.0 adds: 20 tables, 22 columns (nullable or with a default), 1 index, 30 foreign keys and new values on `documents.ownerType`. Nothing is dropped or rewritten, and every step checks first, so it runs on a 1.0.4 database, on one already built by `synchronize` and after stopping halfway. |
| `Subscriptions`  | Paid plans: `subscriptions` and `subscription_payments` tables, their foreign keys and the `subscription` value on `credit_transactions.kind`. Every step checks first.                                                                                                                                      |

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

## Bringing a broker's data from 1.0.4

`npm run legacy:import` copies one broker's kanban stages, customers (stage, lost, budget), customer history and visits from the 1.0.4 database into this one. Run it after the broker signed up and imported the contacts.

```bash
LEGACY_DATABASE_URL="mysql://root:password@old-host:port/railway" \
LEGACY_USER_EMAIL="broker@email.com" \
npm run legacy:import              # dry run, prints what would change
npm run legacy:import -- --apply   # same, then saves
```

The target is the database in `.env`, or `TARGET_DATABASE_URL`. `TARGET_USER_EMAIL` is needed only when the broker signed up with another email.

1. Stages match by name, ignoring case and accents. Old stages keep their order and description, missing ones are created, stages only the new board has go after them.
2. Customers match by phone, written in any format: "(11) 91234-5678", "+55 11 1234-5678" (with or without the ninth digit) and "+351 912 345 678" all work. A match takes the old stage, lost and budget and keeps the new name; the rest are created with the old dates. Brazilian numbers are saved as area code and number, foreign ones with "+" and the country code.
3. Comments and visits keep their dates. Visits lose the link to the property, which is not copied, the address stays.
4. Everything runs in one transaction and running it again copies nothing twice.
