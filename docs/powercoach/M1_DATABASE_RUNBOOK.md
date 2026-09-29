# M1A database and authentication runbook

PowerCoach uses **Supabase-hosted PostgreSQL as a database only**. Authentication
and sessions are owned by Better Auth; Supabase Auth must not be enabled for the
application.

## Connections

- `DATABASE_URL` is the Supabase transaction-pooler URL used by the Next.js
  runtime on Vercel. Include `pgbouncer=true` and keep `connection_limit=1` so
  each serverless instance does not create an unbounded pool.
- `DIRECT_URL` is the direct PostgreSQL connection used by Prisma CLI migration
  jobs. Never expose it to browser code and do not use the pooler to run DDL.
- `BETTER_AUTH_SECRET` must be a production secret of at least 32 random
  characters. `BETTER_AUTH_URL` must be the canonical deployment URL. Add only
  deliberate preview origins to `BETTER_AUTH_TRUSTED_ORIGINS`.

Create separate Supabase projects for preview/staging and production. Store all
values in the corresponding Vercel environment, and use the direct connection
only in a trusted CI migration step.

## Clean bootstrap

The checked-in SQLite file contains disposable prototype state and is not an
account migration source. Keep it only as a reference backup. To bootstrap an
empty PostgreSQL database:

```sh
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
```

Do not run `prisma db push` from an application request or during a Vercel
serverless invocation. Apply migrations once from CI before deploying runtime
code. Better Auth creates and rotates HTTP-only cookie sessions in the migrated
`AuthSession` table; no session or identity token belongs in local storage.

## Verification and rollback

Run `npx prisma migrate status` with both URLs configured, then exercise signup,
sign-in, `/api/auth/me`, sign-out, and role/ownership denial checks. Supabase
backups and point-in-time recovery policy must be selected before production
launch. Roll application code back independently; use forward migrations for
database correction rather than editing an already-applied migration.

Both test commands use Node's test runner with `tsx` to load TypeScript,
Next.js modules and the application's `@/` aliases from `tsconfig.json`.
`npm test` runs the unit tests in `tests/*.test.ts`; the PostgreSQL integration
suite lives separately in `tests/integration/` so it is not run twice in CI.

The dedicated PostgreSQL gate fails immediately when `TEST_DATABASE_URL` is
missing, applies and checks the migrations, then runs the auth integration suite
against that database. The suite also fails if invoked directly without its test
database URL; it never skips or falls back to SQLite:

```sh
TEST_DATABASE_URL="postgresql://.../isolated_test_database" npm run test:postgres
```

Pull requests targeting `powercoach-bootstrap` run the same gate in
`.github/workflows/powercoach-m1a.yml` against a temporary PostgreSQL 16 service
database. The workflow requires no Supabase or production credentials and fails
on migration, auth integration, typecheck, lint, unit-test, or build failures.
