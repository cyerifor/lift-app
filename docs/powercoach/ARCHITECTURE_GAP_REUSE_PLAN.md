# PowerCoach Architecture / Gap / Reuse Plan

**Status:** review draft; no implementation is authorised by this document  
**Scope:** repository audit and Milestone 1 plan only  
**Specification precedence applied:** `ENGINE_SPEC.md` -> `DATA_MODEL.md` -> `UI_UX_SPEC.md` -> `EXERCISE_LIBRARY_SPEC.md` -> `WIREFRAMES.md` -> seed audit -> workbook extraction -> migration -> acceptance tests -> build plan

## Executive decision summary

PowerCoach should evolve the current Lift App rather than start again. The Next.js App Router, React, TypeScript, Tailwind, Prisma access layer, Zod validation habit, role concepts, relational programme skeleton, and some mobile logging interaction ideas are useful foundations. The present domain model and engine are not safe to carry forward unchanged, however: the application stores prescriptions as display strings, identifies logged work by exercise plus set number rather than an exact planned set, has no immutable prescription snapshot, uses a non-authoritative formula instead of the supplied RPE grid, and has two partially competing authentication implementations.

The recommended production direction is:

- Next.js 16 App Router on Vercel;
- Prisma with Supabase-hosted PostgreSQL (database only), using a pooled runtime URL and a direct migration URL;
- one Better Auth-based cookie/session implementation, backed by that PostgreSQL database; do **not** add Supabase Auth alongside it;
- a user-owned, editable `Exercise` library seeded idempotently from the 117 supplied records;
- current session-level `Exercise` rows migrated conceptually to `ExerciseSlot`;
- current `SetPrescription` rows migrated to `PlannedSet`, and `SetLog` rows migrated to `PerformedSet`, with the exact planned-set foreign key and frozen snapshot fields;
- server-side application services/repositories for ownership, normalization, seeding, and exercise-library mutations, with Zod at input boundaries;
- no programme, TODAY, or coaching-engine implementation in Milestone 1.

## 1. Existing Lift App assets to retain

| Existing asset | Decision | Reason / guardrail |
|---|---|---|
| Next.js 16 App Router, React 19, TypeScript | Retain | It is a suitable application chassis. Future work must follow the installed Next.js documentation rather than older conventions. |
| Tailwind CSS 4 and the global styling pipeline | Retain and restyle incrementally | Avoid a UI rewrite. Add PowerCoach tokens and accessible primitives as Milestone 1 needs them. |
| Prisma client singleton (`lib/db.ts`) | Retain the pattern, adjust configuration | A single server-side data layer is appropriate; change the provider and connection strategy for PostgreSQL. |
| Zod request validation | Retain and centralise | Current routes already validate inputs. Move canonical exercise schemas into shared domain validation instead of duplicating route-local schemas. |
| `User`, roles, `Coach`, `Athlete`, coach/athlete relationship | Retain initially | These represent working product concepts and allow existing coach workflows to survive. They need profile/settings normalization and explicit ownership rules, not deletion. |
| `Block`, `Week`, `Session` relational skeleton | Retain for later refactoring | It is useful legacy structure. `Session` already has stable IDs and dates. `Week` may remain as an organizational entity even though canonical identity starts at Block, provided it never replaces explicit session chronology. |
| Session-scoped current `Exercise` rows | Retain their data and identity | They already allow the same template more than once in a session through `(sessionId, orderIndex)`; the entity should be renamed and expanded to `ExerciseSlot`. |
| `ExerciseTemplate` references from session exercises | Retain the referential idea | Stable library ID -> slot references are correct. Ownership and metadata are incomplete and the entity name should change. |
| `SessionLog` check-in/container fields | Retain data during migration | Bodyweight/readiness and a session-log grouping are useful. It should not be the performed-set identity or treat session start as completion. |
| Feedback, media, review, invite, analytics features | Preserve outside M1 | Do not delete working features. Isolate them from schema changes and migrate foreign keys as required. The generic analytics write model is not the future PowerCoach engine model. |
| Mobile local draft behavior in the athlete session page | Retain as reference only | It demonstrates session recovery intent, but localStorage is not a sufficient offline transaction/sync design and belongs to a later TODAY milestone. |
| API ownership checks through athlete/coach relations | Retain the principle | Replace header fallbacks with authenticated server-side authorization. |

## 2. Rename and refactor map

| Current | Target | Treatment |
|---|---|---|
| `ExerciseTemplate` | `Exercise` (library record) | Rename/rebuild with stable ID, `ownerUserId`, canonical metadata, active/archive state, normalized name, source, timestamps, and references from slots/history. |
| Current session `Exercise` | `ExerciseSlot` | Rename and add structured prescription, mode, capability override, reference resolution, suggestion, and notes fields. Do not merge rows by library exercise ID. |
| `SetPrescription` | `PlannedSet` | Preserve stable row IDs where feasible; key each row to one `ExerciseSlot` and enforce unique `(exerciseSlotId, setNumber)`. Slot holds common structured prescription; planned row supplies exact set identity/status. |
| `SetLog` | `PerformedSet` | Link to `plannedSetId` (unique when non-null), retain session/exercise denormalized references for migrated/ad-hoc history, add performed timestamp, outcome, seconds, capability-aware external load, provenance, and immutable snapshot. |
| `SessionLog` | Session check-in / run metadata | Either rename to `SessionRun` and keep one-per-athlete/session semantics, or split check-in into `Checkin`; it must not manufacture a completed timestamp when a session starts. |
| `roundingKg` | `loadStepKg` | Use canonical terminology and allow null for time/bodyweight work. |
| `progEligible` | `progressionEligibility` | Replace Boolean with `YES | NO | OPTIONAL`. |
| `mainLift` string conventions | canonical `SQUAT | BENCH | DEADLIFT | ACCESSORY` | Normalize case and validate. Keep optional `parentLift` separately. |
| `exerciseType` | `setType` | Preserve custom text values while using seeded vocabulary. |
| `repsDisplay`, `rpeDisplay`, `weeklyPercent` | structured fields | Display strings become derived presentation/import values only. |
| generic `Analytics` writes | typed derived entities/services | Later milestones use exposures, strength estimates, variation models, and dose observations. Do not expand generic metric keys in M1. |

## 3. What must be replaced

1. **The existing engine calculations.** `lib/engine.ts` extrapolates a logarithmic RPE curve through reps 1-12, supports RPE 6, uses configurable slopes, selects maximum set e1RM, and adds linear set counts. These conflict with the exact 1-8 rep / 7-10 RPE lookup table, exposure median, structured modes, mode-aware trends, and no-extrapolation rules. Keep only independently valid utilities after tests prove equivalence; otherwise replace it in later engine milestones.
2. **Display-token persistence.** `repsDisplay`/`rpeDisplay` and JSON block configuration cannot remain canonical programme data. They must become structured columns and typed configuration.
3. **Set-log identity.** `(sessionLogId, exerciseId, setNumber)` is not the canonical identity and permits ambiguity across prescriptions. Replace it with an exact, unique nullable `plannedSetId` relationship.
4. **Mutable/no snapshot history.** Current set logs have no frozen prescription facts. Future `PerformedSet` creation must atomically copy the immutable snapshot.
5. **Global/coach-shared seed behavior.** The current route lazily creates approximately 55 hard-coded global templates on the first GET. Replace it with an explicit, idempotent 117-row per-owner seed service from the manifest parts.
6. **Exercise-library API surface.** The current API only lists/creates and lacks normalized uniqueness, trim guarantees, full canonical metadata, edit, duplicate, archive, restore, usage-safe deletion, and inline-create semantics.
7. **Authentication split and insecure compatibility paths.** Better Auth is configured but normal requests use a custom `UserSession`; passwords are embedded inside JSON `Coach.bio`/`Athlete.notes`; clients store tokens/IDs in localStorage; authorization accepts `x-coach-id`/`x-athlete-id`. Replace these with one cookie-backed auth system and server-derived identity.
8. **Filesystem uploads for production.** Vercel's runtime filesystem is not durable. This is outside the library slice unless avatar/logo work is touched, but it must move to object storage before production use.
9. **SQLite as production persistence.** Keep a disposable SQLite database only as a legacy migration source/test fixture if useful; it is not a Vercel production database.

## 4. Required database schema changes

### Milestone 1 tables/fields

**Auth/account tables**

- Align `User` and Better Auth's required user, session, account, and verification schema using the installed adapter's documented model names/fields.
- Preserve `role`; preserve the one-to-one `Coach` and `Athlete` profiles.
- Store credentials only in the auth account table, never profile JSON.

**Profile/settings foundation**

- Add a one-to-one profile/settings record keyed by `userId` (or deliberately extend the existing athlete profile) with `displayName`, `displayUnits`, `bodyweightKg`, `defaultLoadStepKg`, readiness/schedule/prep fields, and nullable reference exercise foreign keys.
- M1 need only expose/store settings needed to determine exercise ownership, display units, and future reference selection. Do not build starting-strength calculations or full Setup UI unless separately approved.

**Editable exercise library**

Suggested fields:

```text
Exercise
  id String stable primary key
  ownerUserId String
  name String
  normalizedName String
  legacyId String?
  mainLift enum
  category String
  movementPattern String?       // nullable for the five incomplete seed rows
  equipment String?             // nullable only for legacy/seed/imported records
  capability enum
  defaultMode enum
  parentLift enum?
  progressionGroup String?
  progressionEligibility enum
  loadStepKg Decimal?
  tier Int?
  restText String?
  seedRatio Decimal?
  notes String?
  source enum SEEDED/CUSTOM/IMPORTED
  active Boolean
  createdAt / updatedAt / archivedAt?
```

- Unique `(ownerUserId, normalizedName)`; normalization must be one defined server function (trim, Unicode normalization, whitespace folding, locale-independent case-folding).
- Index active/filter/search fields initially with ordinary PostgreSQL indexes; measure before adding trigram/full-text search.
- Use `Decimal` for kg, ratios, and RPE/percentage precision where future calculations/persistence need exact decimal behavior; define conversion at service boundaries.
- `ExerciseSlot.exerciseId` must use `onDelete: Restrict`; referenced records archive rather than delete.
- Decide whether user ownership is direct or through an explicit library/workspace. For V1, direct `ownerUserId` is the smallest model consistent with “user-owned rows.”

### Later canonical training migration (designed now, not implemented in M1)

- Rename current session `Exercise` to `ExerciseSlot`, retain IDs, and add all structured fields listed in `DATA_MODEL.md`.
- Rename/backfill `SetPrescription.exerciseId` to `PlannedSet.exerciseSlotId` and retain set IDs.
- Create/backfill `PerformedSet` from `SetLog`, resolving `plannedSetId` only where `(slot, setNumber)` is unambiguous; otherwise leave it null with provenance.
- Add immutable snapshot columns (or a typed versioned JSON snapshot plus indexed critical columns). Explicit columns are preferred for validation/querying; if JSON is used, version it and validate it.
- Add `Checkin`, `Competition`, `StartingStrength`, `Drill`, `SessionPrep`, `Exposure`, `StrengthEstimate`, `VariationPair`, `VariationModel`, and `DoseObservation` only in their approved milestones.
- Add a database constraint/transactional invariant for at most one active block per athlete when block work begins.

## 5. Should current `Exercise` become `ExerciseSlot`?

**Yes.** Its actual meaning is already “one ordered exercise prescription instance in one session,” not a library exercise. It has its own ID, `sessionId`, `orderIndex`, a template reference, prescription-like fields, planned sets, and logged sets. The unique `(sessionId, orderIndex)` also correctly permits two rows referencing the same library exercise.

Migration implications:

1. Rename the table/model without regenerating IDs.
2. Rename `exerciseTemplateId` to `exerciseId` (the library foreign key) only after the library table has been migrated and mapped.
3. Normalize copied slot names as snapshots/display fallbacks, but do not use the name as identity.
4. Convert parseable display fields into structured slot fields with a migration report. Do not invent values for ambiguous tokens.
5. Keep every existing slot distinct even when two slots reference the same exercise and set type.
6. Backfill planned-set relations before performed-set relations.
7. Existing `SetLog` rows can map to a planned set only when their current session slot and set number resolve uniquely. Record unmapped rows as migrated/ad-hoc rather than guessing.
8. Add constraints only after audit/backfill; run duplicate and orphan reports before making `plannedSetId` unique.
9. Preserve a rollback/export of SQLite and verify counts/IDs before cutover.

## 6. Evolving `ExerciseTemplate` into the Exercise Library

1. Create a canonical exercise schema and normalizer shared by UI and service boundaries.
2. Transform existing template rows into owner-scoped library rows. For any genuinely shared legacy row, copy it into each relevant owner's library rather than retain mutable global state.
3. Seed new owners transactionally from `exercises.manifest.json` and its four listed parts. Verify manifest count, part membership, normalized-name uniqueness, and the published family/capability counts before insert.
4. Preserve all five seed rows with blank equipment/movement metadata. New custom rows must supply required values; seeded/imported rows may remain flagged/reviewable.
5. Implement list/search/filter and an archived view over live database rows, not a TypeScript constant.
6. Implement create, edit, duplicate, archive, and restore through services that always enforce owner authorization and normalized uniqueness.
7. Duplicate creates a new `CUSTOM` ID and requires a unique name; it never aliases the original.
8. Archive referenced exercises; permit hard delete only for an unused custom row if that optional behavior is approved.
9. Editing library metadata affects future slots only. Existing slot data and performed snapshots retain historical truth.
10. Expose one reusable `ExerciseForm` and `ExercisePicker` contract so the later Programme drawer can invoke the same create service and receive the newly created ID, without implementing Programme now.

## 7. Mapping prescriptions and logs

| Existing | PowerCoach | Mapping rule |
|---|---|---|
| `SetPrescription` | `PlannedSet` | Preserve ID/set number and point to exact `ExerciseSlot`. Common prescription ranges live structurally on the slot; per-set overrides, if later required, must be explicit rather than hidden in display text. |
| `SessionLog` | `Checkin` plus optional `SessionRun` metadata | Bodyweight/readiness map to check-in. Add sleep when that milestone arrives. `completedAt` must represent finish, not start. A one-per-session run can group operational logging, but is not canonical set identity. |
| `SetLog` | `PerformedSet` | Preserve actual load/reps/RPE/notes, add seconds/outcome/performed timestamp, exact nullable `plannedSetId`, session/library exercise IDs, migration provenance, and immutable snapshot. |

For new logging, the write transaction must authorize the session and planned set, upsert by unique `plannedSetId`, validate capability-specific fields, freeze snapshot fields on first completion, and mark derived models stale. Later edits may alter actual performance fields and trigger recomputation, but must not rewrite the frozen prescription snapshot.

## 8. Donor/reference patterns worth adapting

No donor code should be copied during M1 unless its exact revision and license have been recorded. The environment used for this audit could not fetch GitHub repositories (the network proxy returned HTTP 403), so the donor-specific recommendations below are **pattern-level candidates derived from the approved donor brief, not claims that source code was reviewed or cleared**.

| Donor | Candidate | Reuse mode | M1 decision |
|---|---|---|---|
| `aptx-health/ripit-fitness` | Strength-library/builder information density, mobile exercise selection, session interaction | Inspiration first; direct adaptation only after source/license review | Consider its exercise picker/library interaction when designing responsive list and inline-create contract; do not import domain types. |
| `pr103183/Workout_Tracker_V2` | Dexie transaction/outbox, immediate local writes, retry/idempotency, conflict/recovery states | Adapt architecture after source/license review | Defer implementation beyond M1. Define mutation IDs and idempotent server endpoints now so TODAY can add an outbox later. |
| `apnatvar/open-workout` (Forme) | Exercise discovery, search/filter facets, builder selection | Inspiration first | Adapt search/filter interaction ideas only; keep the 117-row user library authoritative and import external catalogue entries as copies. |
| `shadcn-ui/ui` | Command, Sheet/Drawer, Dialog/AlertDialog, form controls, dropdown, switches, toast | Directly add generated source components selectively | Strong M1 fit for the mobile picker/form/archive confirmation. Keep generated components local and accessible; avoid importing an entire component catalogue. |
| Lucide | Consistent action/navigation icons | Dependency use | Suitable in M1 if icons are needed; text labels remain mandatory for important actions. |
| Apache ECharts | Progress visualizations | Dependency use | No M1 use; reserve for Progress. Engine supplies all values. |
| Storybook | Isolated states for reusable controls | Tooling | Defer unless the M1 picker/form state matrix becomes expensive to test in-app. Component tests provide better immediate value. |

## 9. Donor approaches not to copy

- Any donor programme model keyed by exercise name, catalogue exercise, array position, or `(exercise, setNumber)` instead of the canonical identity chain.
- Any workout builder that collapses repeated uses of the same exercise in a session.
- Any donor's coaching formula, progression algorithm, estimated-max equation, analytics aggregation, or future-data behavior.
- A global immutable master catalogue as the user's actual library. External catalogues may only be discovery/import sources.
- IndexedDB as the system of record or last-write-wins sync without idempotency/conflict rules.
- Client-only authentication, IDs trusted from headers/localStorage, or authorization inferred from hidden UI.
- Media/assets from exercise catalogues unless each asset's redistribution/commercial rights are verified.
- Wholesale shadcn styling that erases the PowerCoach visual hierarchy; use primitives, not a second design specification.
- Charts that calculate metrics inside rendering configuration.
- Donor database/auth stacks merely for similarity; PowerCoach keeps one chosen stack.

## 10. License and attribution gate

Before direct reuse, add a reuse record containing repository URL, commit SHA/tag, source paths, copied/adapted status, dependency implications, license file, copyright notice, required attribution, and conflicts checked against the specification.

- `ripit-fitness`, `Workout_Tracker_V2`, and `open-workout`: license status was not verifiable in this audit because the repositories could not be fetched. Treat all source and assets as **no-copy** until verified. Merely studying a UI pattern still requires an independent implementation without copying protected expression.
- shadcn/ui: verify the license at the revision used and preserve any required notice in the repository's third-party notices. Generated components must remain reviewable local source.
- Lucide: verify and record the package license/version selected, and preserve its required copyright/license notice.
- Apache ECharts: verify and satisfy Apache-2.0 notice/license requirements when introduced; preserve notices for redistributed code and document modifications where required.
- Storybook: verify and record the selected package licenses when introduced.
- Seed/workbook-derived data: preserve its internal provenance; do not mix third-party catalogue data or media into it without a separate source/license field.

M1 should add a `THIRD_PARTY_NOTICES.md` only if a new dependency or copied donor code actually requires it. A plan mentioning a donor does not itself justify copying code.

## 11. SQLite -> Vercel production database path

### Recommendation

Supabase Postgres remains the best default from the approved options: managed PostgreSQL is compatible with Prisma and Vercel, provides backups/operations, and leaves a path to storage/realtime later. Use Supabase as the **database host**, not as a second auth system. This should be reconfirmed against pricing, region, pooling, backup, and point-in-time-recovery requirements immediately before provisioning because vendor offerings change.

### Migration path

1. Freeze and back up `prisma/dev.db`; record table counts and orphan/duplicate reports.
2. Finalize the PostgreSQL Prisma schema and create a baseline migration checked into `prisma/migrations/` (none exist today).
3. Provision separate preview/staging and production Supabase projects in the appropriate region.
4. Configure a runtime pooled `DATABASE_URL` suitable for Vercel/serverless and a direct `DIRECT_URL` for Prisma migrations/admin operations. Confirm the exact current Supabase/Prisma pooler parameters during implementation.
5. Apply migrations through CI/deployment using the direct URL; never run schema mutation opportunistically from an app request.
6. Build an idempotent migration command that reads SQLite, transforms rows, writes PostgreSQL in dependency order, and stores migration source keys.
7. Migrate auth/users/profiles, exercise library, programme hierarchy, then logs/history; do not infer missing facts.
8. Compare source/target counts, foreign-key coverage, normalized duplicates, and sampled records. Dry-run before cutover.
9. Switch staging traffic, exercise rollback, then production. Keep SQLite read-only until reconciliation is signed off.
10. Use ephemeral PostgreSQL (or isolated schemas/databases) in integration tests so production behavior is tested against the actual provider.

Do not use Vercel's filesystem or SQLite in a serverless function as durable storage. Do not enable Supabase Row Level Security as a substitute for application authorization without a deliberate design: Prisma's server connection can bypass or complicate per-request RLS context. For M1, enforce ownership in server services and database foreign keys; revisit defense-in-depth RLS separately.

## 12. One auth architecture

### Decision

Complete the already-started Better Auth direction and remove the custom parallel session path. Better Auth should own credential hashing, account/session persistence, expiration/rotation, and the secure HTTP-only cookie. Supabase supplies PostgreSQL only; **do not enable Supabase Auth for application login**.

### Required cleanup

- Add the Better Auth route handler and adapter-required schema according to the installed version's docs.
- Migrate existing valid credentials into Better Auth accounts where possible; because current hashes use Better Auth crypto, validate whether hashes are portable before cutover. Otherwise require a controlled password reset.
- Remove passwords from `Coach.bio` and `Athlete.notes` after verified migration.
- Replace the custom `UserSession` model and `lib/session.ts` flow; do not leave both active.
- Stop returning/storing session tokens in localStorage.
- Remove `x-coach-id` and `x-athlete-id` authorization fallbacks. Resolve the user/role/profile on the server from the session every time.
- Centralize `requireUser`, `requireCoach`, `requireAthlete`, and owner/coach-to-athlete authorization helpers.
- Preserve the role/profile model and invitation workflow, but make invite acceptance create one Better Auth user/account/session transactionally.
- Add CSRF/origin, cookie, rate-limit, and authorization tests appropriate to Better Auth and Next.js route handlers.

This is a foundation correction, not a second user-facing auth product. If credential migration risk cannot be resolved within M1, gate the Exercise Library behind the existing cookie session temporarily but do not introduce Supabase Auth or expand both systems.

## 13. Exact Milestone 1 implementation scope

### In scope after approval

1. PostgreSQL/Supabase-ready Prisma schema, checked-in migrations, environment contract, and a documented SQLite migration/dry-run path.
2. One operational auth/session architecture sufficient to identify and authorize the current user; migration/removal of credential-in-profile and header/localStorage compatibility paths.
3. Minimum profile/settings ownership foundation (user identity, role/profile relation, display units/default load step if required by the exercise form).
4. Canonical editable user-owned Exercise table and stable IDs.
5. Idempotent validation and seeding of all 117 exercises from the manifest/parts, preserving missing legacy metadata and seed provenance.
6. Mobile-first Exercise Library route with search, required filters, active/archived view, specified sorts where data exists, loading/empty/error/saved states.
7. Create, edit, duplicate, archive, and restore with server-side authorization, canonical validation, normalized-name uniqueness, trimming, and useful conflict errors.
8. Usage-safe archive behavior and historical-reference integrity.
9. Reusable Exercise form/picker and inline-create service contract for later Programme use. A library-owned demo/integration state may prove “create and return selected ID”; do not build Programme.
10. Automated tests and seed-validation command proving the acceptance criteria listed below.
11. Migration of legacy `ExerciseTemplate` data necessary to avoid losing existing library/slot references. Full `ExerciseSlot`/PlannedSet/PerformedSet cutover may be staged, but the M1 schema must not create a second competing library.

### Explicitly out of scope

- Block builder changes, date generation, programme progression/deload, activation, or competition fit.
- TODAY runner changes, performed-set snapshot implementation, offline Dexie/outbox, prep, and readiness UI.
- RPE/e1RM/reference resolution, Double Progression, variation/dose/strength models, and analytics charts.
- Competition, drill library, full Setup/onboarding, historical workbook training-log import, PWA, Storybook, or external exercise-catalogue import.
- Milestone 2 or later even if a donor supplies a ready-made implementation.

## 14. Expected Milestone 1 file changes

Exact names may adjust to installed library conventions, but review should expect this footprint rather than broad unrelated rewrites.

### Change

- `package.json`, `package-lock.json` — test/UI/auth/database dependencies and scripts only as approved.
- `prisma/schema.prisma` — PostgreSQL, unified auth models, profile/settings foundation, canonical Exercise library, safe legacy relations.
- `lib/db.ts` — serverless-safe PostgreSQL/Prisma configuration if required.
- `lib/auth.ts` — single Better Auth configuration.
- `lib/get-athlete.ts`, `lib/get-coach.ts` — server-derived authorization; remove trusted identity headers.
- auth routes/pages and callers that currently use the custom session/localStorage IDs.
- `app/globals.css`, `app/layout.tsx` — PowerCoach tokens/layout foundation needed by the library.
- `types/index.ts` — remove divergent handwritten exercise/auth types or align them with canonical domain types.
- legacy exercise-library route/callers — point to the canonical service or become compatibility redirects during one controlled migration.
- `README.md` — local PostgreSQL, migrations, seeding, testing, and environment setup.

### Create

- `prisma/migrations/<timestamp>_powercoach_m1_foundation/migration.sql`
- `prisma/seed.ts` (or `scripts/seed-powercoach.ts`)
- `scripts/validate-powercoach-seeds.ts`
- `scripts/migrate-sqlite-to-postgres.ts` and/or a documented dry-run/reconciliation command
- `.env.example` (secrets omitted)
- `app/api/auth/[...all]/route.ts` (exact Better Auth handler path to follow installed docs)
- `app/(powercoach)/layout.tsx`
- `app/(powercoach)/exercise-library/page.tsx`
- `app/api/exercises/route.ts`
- `app/api/exercises/[exerciseId]/route.ts`
- action-specific duplicate/archive/restore handlers or server actions, using one service layer
- `components/exercises/exercise-library.tsx`
- `components/exercises/exercise-list.tsx`
- `components/exercises/exercise-filters.tsx`
- `components/exercises/exercise-form.tsx`
- `components/exercises/exercise-picker.tsx`
- `components/ui/*` only for selected generic primitives
- `lib/exercises/schema.ts`
- `lib/exercises/normalize-name.ts`
- `lib/exercises/repository.ts`
- `lib/exercises/service.ts`
- `lib/exercises/seed.ts`
- `lib/auth/authorization.ts` if the auth module benefits from separation
- unit/component/integration/e2e test configuration and focused tests under the repository's chosen convention
- `docs/powercoach/M1_MIGRATION_RUNBOOK.md`
- `THIRD_PARTY_NOTICES.md` only if actual M1 reuse requires it

### Retire after verified migration

- `lib/exercise-seeds.ts` hard-coded partial catalogue.
- `lib/session.ts` custom competing session implementation.
- custom auth endpoints that duplicate Better Auth behavior.
- localStorage session-token and identity-ID usage.

No file should be deleted until its data/callers have a tested replacement.

## 15. Tests proving Milestone 1

### Seed/data tests

- Manifest resolves exactly four part files and exactly 117 unique normalized exercise names.
- Published main-lift, capability, default-mode, and progression-eligibility counts match the seed audit.
- The five known incomplete rows import unchanged with reviewable null metadata.
- Re-running seed for one owner is idempotent; seeding a second owner creates independent rows/IDs.
- Existing legacy library/slot references remain resolvable after migration.

### Domain/service tests

- Names are trimmed/normalized consistently; blank names and duplicate normalized names are rejected per owner with a human-readable conflict.
- New custom exercises require equipment/movement metadata according to the final validation decision while legacy seed rows remain valid.
- Optional `seedRatio` stays null and is never coerced to `1`.
- Capability/default mode/progression eligibility/tier/load step validation covers valid bodyweight/time/null-load-step cases.
- Create, edit, duplicate, archive, and restore enforce ownership.
- Duplicate gets a new stable ID/source and cannot reuse a normalized name.
- Referenced exercises archive rather than disappear; edit/archive never changes a fixture performed-set snapshot.

### API/auth/integration tests

- Anonymous/cross-user/cross-athlete requests cannot read or mutate another user's library.
- Cookie session, expiration/logout, and role/profile resolution work without localStorage tokens or identity headers.
- List search covers name, movement pattern, progression group, and equipment; filters cover the specification; archived records are opt-in.
- Concurrent duplicate creates produce one success and one deterministic conflict via the database unique constraint.
- Invalid IDs/inputs return useful 4xx responses, not generic 500s.
- PostgreSQL migration deploys from an empty database and the SQLite migration dry-run is repeatable without duplicates.

### UI/accessibility/e2e tests

- Mobile and desktop list/search/filter states; loading, empty, error, active, and archived states.
- Keyboard-accessible picker/drawer/dialog, labelled controls, focus return, destructive confirmation, and visible saved/error feedback.
- User creates, edits, duplicates with a new name, archives, filters archived, restores, and immediately finds the restored exercise.
- Reusable inline-create flow returns the new exercise ID and selected record without implementing Programme.
- Narrow viewport has no horizontal form overflow and tap targets remain usable.

### Commands expected in the approved implementation

- seed validation
- Prisma format/validate/migration status
- TypeScript typecheck
- ESLint
- unit/integration/component test suite
- browser e2e suite against PostgreSQL
- production `next build`

The current repository has no test runner or checked-in Prisma migrations, so adding those foundations is part of M1 rather than evidence available today.

## 16. Contradictions and missing decisions

### Contradictions discovered

1. **Auth direction:** `BUILD_PLAN.md` says “Supabase auth and database,” while the handoff says not to replace working auth or keep two systems, and the repo already depends on Better Auth. Resolution proposed: Supabase database + Better Auth, no Supabase Auth. Human approval required.
2. **Auth implementation is already split:** `lib/auth.ts` configures Better Auth with a PostgreSQL adapter while Prisma declares SQLite; active routes use custom `UserSession`, and password hashes live in profile JSON. This is not one working architecture and must be resolved before production.
3. **Migration bundle mismatch:** `MIGRATION_SPEC.md` says migration `exercises.json`, `drills.json`, `rpe-grid.json`, and `training-log.json` are bundled. The repository currently contains only `README.md` and `system.json` under `data/powercoach/migration/`. The reported 325 history rows therefore cannot be imported or verified yet.
4. **Workbook extraction path mismatch:** `WORKBOOK_RULE_EXTRACTION.md` says the RPE table is already in `src/lib/powercoach/rpe.ts`; there is no `src/` tree or that module in this repo.
5. **Seed strategy mismatch:** the specification requires 117 user-owned rows; current code lazily inserts a much smaller hard-coded global list and attaches custom records to coaches.
6. **Exercise required fields:** the Exercise Library spec calls `movement_pattern` required, then permits five legacy rows where both movement and equipment are blank. Resolution proposed: database nullable for migration fidelity, service validation conditional on `source`, and a review state.
7. **Exercise ownership/product persona:** the spec alternates “user” and “athlete,” while the current app is coach-led. Direct `ownerUserId` is proposed, but the product must decide whether coaches edit an athlete's library, maintain a coach library copied to athletes, or both. M1 should not invent multi-library sharing.
8. **Milestone naming:** `POWERCOACH_CODEX_HANDOFF.md` defines M1 as foundation + Exercise Library, while `BUILD_PLAN.md` calls all trustworthy-loop work “Phase 1.” Treat the handoff's narrower M1 as authoritative for the next implementation slice.
9. **Session start/completion:** current `SessionLog.completedAt` is required and populated when starting; the specification distinguishes live state from completion. Later migration must split these timestamps/states.
10. **Inline-create acceptance vs M1 boundary:** acceptance test 12 names Programme, but Programme is explicitly later. Resolution proposed: build/test the reusable picker callback/contract in M1, integrate it into Programme only in that milestone.

### Decisions needed before implementation

1. Approve Supabase-hosted Postgres + Better Auth (and explicitly reject adding Supabase Auth).
2. Define library ownership and coach permissions: athlete-owned only is recommended for canonical user data; clarify how a coach edits/selects on an athlete's behalf.
3. Decide whether existing local SQLite user/programme data is production-worthy data to migrate or disposable development fixture data.
4. Supply the missing migration JSON files or revise `MIGRATION_SPEC.md` to state that history migration is not yet bundled.
5. Decide whether M1 performs the physical `Exercise` -> `ExerciseSlot` rename now or only makes the new library coexist temporarily with explicit legacy naming. Recommendation: migrate the library in M1 and prepare a safe slot compatibility relation; do the full training identity cutover as one later transactional vertical slice, not half-convert logging.
6. Decide whether hard deletion of an unused custom exercise is wanted. Recommendation: omit it in V1; archive/restore is safer and sufficient.
7. Confirm normalized-name semantics (recommended: Unicode NFKC, trim, collapse whitespace, lowercase) and whether same-name exercises can differ by owner only.
8. Confirm whether “Recently used” sort should be present but disabled until programme/history usage exists, or implemented from legacy slot references in M1.
9. Confirm the initial deployment region, backup/PITR requirement, and preview database policy before provisioning Supabase.
10. Re-run donor source/license review in a network-enabled environment before any direct adaptation. Until then, approve only independent pattern-inspired work and already-vetted package dependencies.

## Review gate

No implementation work, schema migration, dependency installation, donor-code copying, or Milestone 2 work should begin until the decisions above—especially auth, ownership, database, and slot migration timing—are approved.
