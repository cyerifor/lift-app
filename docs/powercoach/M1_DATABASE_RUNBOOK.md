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
