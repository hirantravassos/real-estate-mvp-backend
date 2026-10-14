# Security standard, backend

These are the non negotiable security criteria for this API. Every agent and
every contributor follows them on every change. They exist because real
vulnerabilities were found here on 2026-10-13; the full report is in
`docs/security/pentest-2026-10-13.md`. Keep this file current: when a review
finds a new class of problem, add a rule.

This is a multi tenant app. Each broker (`User`) only ever sees and mutates
their own data. Treat a cross tenant leak as a release blocker.

## 1. Object level authorization (the rule that was broken)

- Never upsert by a client supplied id. `repository.save(entity)` with a set
  `id` runs a blind `UPDATE ... WHERE id = ?` and will overwrite another
  tenant's row and reassign its `userId`. On update, first load the row scoped
  to the user (`findOneByOrFail({ id, user: { id: user.id } })`), 404 if
  missing, then `merge` the DTO and save.
- Every id that arrives in a route param or a DTO body is hostile until proven
  owned. Scope the main entity by `user.id`, and validate every referenced id
  (`kanbanId`, `propertyId`, `customerId`, `documentId`, `itemId`, `signerId`,
  `mediaId`, ...) against the user before use.
- When filtering by a nested relation in `update`/`delete`, do not rely on a
  deep criterion like `{ customer: { user: { id } } }`; TypeORM can reduce it to
  the join key and drop the user filter. Load the row scoped to the user first,
  then mutate by its own id, and assert `result.affected`.
- Do not eager load a relation that belongs to another entity without filtering
  it by `user.id` as well. A takeover plus an unfiltered relation is a data
  breach, not just a tampering bug.

## 2. Authentication and tokens

- Every secret comes from the environment with no insecure fallback. Fail
  startup if `JWT_SECRET` or `JWT_REFRESH_SECRET` is missing. Assert `JWT_REFRESH_SECRET !== JWT_SECRET`. No literal secret ever
  ships in code or in `.env.example` beyond an obvious placeholder.
- Access and refresh tokens carry a `typ` claim (`access` / `refresh`) that is
  verified, so they are never interchangeable.
- Support revocation: a `jti` or per user token version, a `POST /auth/logout`
  that bumps it, and refresh rotation.
- Do not accept tokens from URL query parameters on general routes. If a stream
  or media route needs it, mint a short lived, single purpose token.
- Federated login verifies `email_verified === true` and binds the provider
  `sub` to the account; never match by email alone.
- User ids are not secret (they leak in storage URLs). Security must never
  depend on an id being unguessable.

## 3. Input, output and transport

- Keep the global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`.
  No DTO ever exposes `user`, `userId`, `credits`, `balance`, role, plan or
  status. Mappers copy fields explicitly.
- Parameterize all SQL. Never interpolate user input into a QueryBuilder string,
  an `orderBy`, or a raw query. Escape any user input used to build a regex.
- Serve user supplied files as `attachment` unless the stored type is on an
  inline safe allowlist (jpeg, png, webp, gif, mp4, ogg, pdf). Map unknown
  types to `application/octet-stream`. Never trust a client declared MIME type
  for an inline response.
- Set `trust proxy` and read the client IP from the platform hop, not from raw
  `X-Forwarded-For`, whenever the IP is used as evidence or for throttling.
- Add helmet (HSTS, `nosniff`, no `x-powered-by`). Scope the large JSON body
  limit to the webhook route that needs it; keep the rest small.
- CORS stays a strict allowlist of known origins. Never reflect the request
  origin.

## 4. Money, credits and external calls

- Any spend is atomic: reserve the estimate in the same conditional `UPDATE`
  that checks the balance (`... WHERE userId = ? AND balance >= :est`), then
  settle or refund. Never check then spend across an `await`.
- Webhooks verify their signature and refuse the call when the secret is empty
  in production. Never grant value from the webhook body alone; refetch state
  from the provider API and make settlement idempotent under a lock.
- Rate limit public and paid routes. Keep a global throttler enabled, plus
  `UserThrottlerGuard` on AI, lookup and payment routes.

## 5. Uploads and storage

- Storage keys are always `prefix/${userId}/.../${randomUUID()}.${safeExt}`.
  Validate the user scoped prefix on confirm.
- Presigned uploads bound the size (`createPresignedPost` with
  `content-length-range`) and pin the content type. Re validate the real object
  size after upload. Add a lifecycle rule to expire unconfirmed objects.

## 6. Crypto and signatures

- Symmetric encryption is AES 256 GCM with a random 12 byte IV and
  `{ authTagLength: 16 }` on decrypt. Derive keys with HKDF and a context label;
  never reuse one secret for two purposes.
- An e signature is bound to the exact artifact the signer saw (compare the
  `sha256`), to a single signer (own link, verified identity field), and is
  applied only while the record is `PENDING`.

## 7. Dependencies and secrets hygiene

- `npm audit --omit=dev` runs in CI; no new critical or high advisory merges.
- `.env` is never committed. Only `.env.example` with placeholders is tracked.
- Never log secrets, tokens, full request bodies, or more than a short, scrubbed
  slice of an upstream error.

## Checklist for any PR that touches data access, auth, money, uploads or crypto

- [ ] Every route param and body id is scoped or validated against `user.id`.
- [ ] No `save()` upsert driven by a client id; updates load owner scoped first.
- [ ] No new DTO field can set ownership, balance, role or status.
- [ ] Secrets read from env, no fallback, startup fails if missing.
- [ ] User supplied files served as `attachment` unless inline safe.
- [ ] Spends are atomic; webhooks verify signatures and refetch state.
- [ ] `npm audit --omit=dev` is clean of critical and high.
- [ ] A cross tenant test exists: a second user cannot read or mutate the first
      user's new resource.
