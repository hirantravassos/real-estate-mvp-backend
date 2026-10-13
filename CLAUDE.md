# CLAUDE.md, backend

Guidance for any AI agent or contributor working in this repository.

## Stack

NestJS 11 (ESM, `.js` import specifiers), TypeORM 0.3 on MySQL, Mongo (mongoose)
for some stores, Passport (Google OAuth + JWT), S3 compatible storage, Evolution
API for WhatsApp, OpenAI, Mercado Pago. Domain driven layout under
`src/domains/<domain>/{controllers,services,entities,dtos,mappers,...}`,
shared code under `src/shared`, integrations under `src/infrastructure`.

## Conventions

- TypeScript only, double quotes always, full descriptive names (no acronyms
  for variables).
- The schema changes only through migrations (`synchronize: false`); never edit
  an applied migration, add a new one.
- Keep ownership scoping and mapper patterns consistent with the surrounding
  domain.

## Security is a first class requirement

Read and follow `SECURITY.md` before changing anything that touches data
access, authentication, money, uploads or crypto. It is the standing security
standard for this codebase and is binding. The findings that produced it are in
`docs/security/pentest-2026-10-13.md`.

The rules that are most often broken here, so check them every time:

1. This is multi tenant. Every route param and body id is hostile until scoped
   to the authenticated `user.id`. Cross tenant read or write is a release
   blocker.
2. Never upsert by a client supplied id. On update, load the row scoped to the
   user first (404 if absent), then merge the DTO. A blind `save()` with a set
   `id` overwrites and steals another tenant's row.
3. Secrets come from the environment with no insecure fallback; startup fails if
   a required secret is missing.
4. Keep the `ValidationPipe` whitelist on; no DTO may set `user`, `userId`,
   `credits`, `balance`, role, plan or status.
5. Serve user supplied files as `attachment` unless the type is inline safe.
6. Spends are atomic; webhooks verify signatures and refetch provider state.

Before opening a PR, run the checklist at the end of `SECURITY.md`, including a
cross tenant test: a second user must not be able to read or mutate the first
user's new resource.
