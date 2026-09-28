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
- an athlete-owned, editable `Exercise` library seeded idempotently from the 117 supplied records, with authorised coach management where an athlete has a coach;
- a self-coached athlete model in which `Athlete.coachId` is optional;
- current session-level `Exercise` rows exposed conceptually as `ExerciseSlot`, using Prisma model/table mapping to preserve physical tables and IDs during M1;
- current `SetPrescription` rows migrated to `PlannedSet`, and `SetLog` rows migrated to `PerformedSet`, with the exact planned-set foreign key and frozen snapshot fields;
- server-side application services/repositories for ownership, normalization, seeding, and exercise-library mutations, with Zod at input boundaries;
- no programme, TODAY, or coaching-engine implementation in Milestone 1;
- three mandatory, sequential review gates: M1A foundation/auth, M1B Exercise Library data/API, and M1C Exercise Library UI/e2e. Work stops after each gate for review.

## 1. Existing Lift App assets to retain

| Existing asset | Decision | Reason / guardrail |
|---|---|---|
| Next.js 16 App Router, React 19, TypeScript | Retain | It is a suitable application chassis. Future work must follow the installed Next.js documentation rather than older conventions. |
| Tailwind CSS 4 and the global styling pipeline | Retain and restyle incrementally | Avoid a UI rewrite. Add PowerCoach tokens and accessible primitives as Milestone 1 needs them. |
| Prisma client singleton (`lib/db.ts`) | Retain the pattern, adjust configuration | A single server-side data layer is appropriate; change the provider and connection strategy for PostgreSQL. |
| Zod request validation | Retain and centralise | Current routes already validate inputs. Move canonical exercise schemas into shared domain validation instead of duplicating route-local schemas. |
| `User`, roles, `Coach`, `Athlete`, coach/athlete relationship | Retain and loosen | These represent working product concepts. `Athlete.coachId` must become nullable so self-coached athletes are first-class; an assigned coach may be authorised to act on an athlete's resources. |
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
| `ExerciseTemplate` | `Exercise` (library record) | Use the code-level Prisma model name `Exercise` with `@@map("ExerciseTemplate")` during the safe transition. Preserve physical table name and IDs while adding `athleteId`, canonical metadata, active/archive state, normalized name, source, timestamps, and references. |
| Current session `Exercise` | `ExerciseSlot` | Use the code-level Prisma model name `ExerciseSlot` with `@@map("Exercise")` during the safe transition. Preserve physical table name and IDs, then add structured prescription fields in the later training milestone. Do not merge rows by library exercise ID. |
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
5. **Global/coach-shared seed behavior.** The current route lazily creates approximately 55 hard-coded global templates on the first GET. Replace it with an explicit, idempotent 117-row per-athlete seed service from the manifest parts.
6. **Exercise-library API surface.** The current API only lists/creates and lacks normalized uniqueness, trim guarantees, full canonical metadata, edit, duplicate, archive, restore, usage-safe deletion, and inline-create semantics.
7. **Authentication split and insecure compatibility paths.** Better Auth is configured but normal requests use a custom `UserSession`; passwords are embedded inside JSON `Coach.bio`/`Athlete.notes`; clients store tokens/IDs in localStorage; authorization accepts `x-coach-id`/`x-athlete-id`. Replace these with one cookie-backed auth system and server-derived identity.
8. **Filesystem uploads for production.** Vercel's runtime filesystem is not durable. This is outside the library slice unless avatar/logo work is touched, but it must move to object storage before production use.
9. **SQLite as production persistence.** Back up the disposable prototype database for reference, then establish PostgreSQL cleanly; SQLite is neither a Vercel production database nor an M1 production-migration source.

## 4. Required database schema changes

### Milestone 1 tables/fields

**Auth/account tables**

- Align `User` and Better Auth's required user, session, account, and verification schema using the installed adapter's documented model names/fields.
- Preserve `role`; preserve the one-to-one `Coach` and `Athlete` profiles.
- Store credentials only in the auth account table, never profile JSON.

**Profile/settings foundation**

- Add a one-to-one profile/settings record keyed by `userId` (or deliberately extend the existing athlete profile) with `displayName`, `displayUnits`, `bodyweightKg`, `defaultLoadStepKg`, readiness/schedule/prep fields, and nullable reference exercise foreign keys.
- Make `Athlete.coachId` nullable and its `Coach` relation optional. Athlete ownership and authorization must work with no coach assigned. Where a coach is assigned, an explicit authorization helper may permit that coach to manage the athlete's library; possession of an athlete ID alone is never authorization.
- M1 need only expose/store settings needed to determine exercise ownership, display units, and future reference selection. Do not build starting-strength calculations or full Setup UI unless separately approved.

**Editable exercise library**

Suggested fields:

```text
Exercise
  id String stable primary key
  athleteId String
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

- Unique `(athleteId, normalizedName)`; normalization must be one defined server function (trim, Unicode normalization, whitespace folding, locale-independent case-folding).
- Index active/filter/search fields initially with ordinary PostgreSQL indexes; measure before adding trigram/full-text search.
- Use `Decimal` for kg, ratios, and RPE/percentage precision where future calculations/persistence need exact decimal behavior; define conversion at service boundaries.
- `ExerciseSlot.exerciseId` must use `onDelete: Restrict`; referenced records archive rather than delete.
- Library ownership is directly athlete-centric in V1. A self-coached athlete manages their own rows; an assigned coach may manage those same rows only through an explicit athlete/coach authorization check. Do not create shared global mutable rows or a coach-owned master catalogue in M1. A separate coach template/catalogue domain may be designed later without changing athlete-library identity.

**Prisma naming without premature physical renames**

The two legacy uses of “Exercise” must be separated at the Prisma model/API level while preserving existing physical table names and primary keys during M1:

```prisma
model Exercise {
  // Editable athlete library; existing ExerciseTemplate columns/rows evolve in place.
  @@map("ExerciseTemplate")
}

model ExerciseSlot {
  // One session prescription instance; existing Exercise columns/rows stay in place.
  @@map("Exercise")
}
```

Use `@map` on renamed foreign-key columns where needed so generated Prisma APIs can use canonical names without a destructive table/column rename. M1 migrations may add library ownership/metadata and adjust constraints, but must not regenerate IDs, copy slots into a second table, or physically swap the two table names. A later canonical-training migration may rename physical tables only if the operational benefit justifies the risk.

### Later canonical training migration (designed now, not implemented in M1)

- Evolve the mapped current session `Exercise` table through the code-level `ExerciseSlot` model, retain IDs, and add all structured fields listed in `DATA_MODEL.md`.
- Rename/backfill `SetPrescription.exerciseId` to `PlannedSet.exerciseSlotId` and retain set IDs.
- Create/backfill `PerformedSet` from `SetLog`, resolving `plannedSetId` only where `(slot, setNumber)` is unambiguous; otherwise leave it null with provenance.
- Add immutable snapshot columns (or a typed versioned JSON snapshot plus indexed critical columns). Explicit columns are preferred for validation/querying; if JSON is used, version it and validate it.
- Add `Checkin`, `Competition`, `StartingStrength`, `Drill`, `SessionPrep`, `Exposure`, `StrengthEstimate`, `VariationPair`, `VariationModel`, and `DoseObservation` only in their approved milestones.
- Add a database constraint/transactional invariant for at most one active block per athlete when block work begins.

## 5. Should current `Exercise` become `ExerciseSlot`?

**Yes at the code/domain level; not yet as a physical-table rename.** Its actual meaning is already “one ordered exercise prescription instance in one session,” not a library exercise. It has its own ID, `sessionId`, `orderIndex`, a template reference, prescription-like fields, planned sets, and logged sets. The unique `(sessionId, orderIndex)` also correctly permits two rows referencing the same library exercise. Prisma should call this model `ExerciseSlot` while `@@map("Exercise")` keeps the existing table and IDs intact.

Migration implications:

1. Rename the Prisma model to `ExerciseSlot` and map it to the existing physical `Exercise` table; do not physically rename the table or regenerate IDs in M1.
2. Expose `exerciseTemplateId` as the canonical `exerciseId` relation field with `@map("exerciseTemplateId")` where practical, after the mapped library model is in place.
3. Normalize copied slot names as snapshots/display fallbacks, but do not use the name as identity.
4. Convert parseable display fields into structured slot fields with a migration report. Do not invent values for ambiguous tokens.
5. Keep every existing slot distinct even when two slots reference the same exercise and set type.
6. Backfill planned-set relations before performed-set relations.
7. Existing `SetLog` rows can map to a planned set only when their current session slot and set number resolve uniquely. Record unmapped rows as migrated/ad-hoc rather than guessing.
8. Add constraints only after audit/backfill; run duplicate and orphan reports before making `plannedSetId` unique.
9. Preserve a backup/export of SQLite for reference. M1 does not promise a row-for-row prototype-data migration.

## 6. Evolving `ExerciseTemplate` into the Exercise Library

1. Create a canonical exercise schema and normalizer shared by UI and service boundaries.
2. Expose the legacy physical `ExerciseTemplate` table through the code-level `Exercise` Prisma model using `@@map`, then evolve it to athlete-owned rows without regenerating referenced IDs.
3. Seed each athlete transactionally from `exercises.manifest.json` and its four listed parts. Verify manifest count, part membership, normalized-name uniqueness, and the published family/capability counts before insert.
4. Preserve all five seed rows with blank equipment/movement metadata. New custom rows must supply required values; seeded/imported rows may remain flagged/reviewable.
5. Implement list/search/filter and an archived view over live database rows, not a TypeScript constant.
6. Implement create, edit, duplicate, archive, and restore through services that always enforce athlete/assigned-coach authorization and per-athlete normalized uniqueness.
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

Donor repositories remain pattern/reference sources unless the exact source revision has an unambiguously verified compatible licence and its obligations are recorded. The environment used for this audit could not fetch GitHub repositories (the network proxy returned HTTP 403), so the repository-specific recommendations below are **pattern-level candidates derived from the approved donor brief, not claims that source code was reviewed or cleared**. shadcn/ui and Lucide are separately approved as vetted dependencies/primitives, subject to preserving the notices required by the versions actually installed.

| Donor | Candidate | Reuse mode | M1 decision |
|---|---|---|---|
| `aptx-health/ripit-fitness` | Strength-library/builder information density, mobile exercise selection, session interaction | Inspiration first; direct adaptation only after source/license review | Consider its exercise picker/library interaction when designing responsive list and inline-create contract; do not import domain types. |
| `pr103183/Workout_Tracker_V2` | Dexie transaction/outbox, immediate local writes, retry/idempotency, conflict/recovery states | Adapt architecture after source/license review | Defer implementation beyond M1. Define mutation IDs and idempotent server endpoints now so TODAY can add an outbox later. |
| `apnatvar/open-workout` (Forme) | Exercise discovery, search/filter facets, builder selection | Inspiration first | Adapt search/filter interaction ideas only; keep the 117-row user library authoritative and import external catalogue entries as copies. |
| `shadcn-ui/ui` | Command, Sheet/Drawer, Dialog/AlertDialog, form controls, dropdown, switches, toast | Vetted primitive; directly add generated source components selectively | Strong M1C fit for the mobile picker/form/archive confirmation. Keep generated components local and accessible; preserve required notices and avoid importing an entire component catalogue. |
| Lucide | Consistent action/navigation icons | Vetted dependency use | Suitable in M1C if icons are needed; preserve required notices and keep text labels for important actions. |
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
- shadcn/ui and Lucide are approved as vetted dependencies/primitives. Record the exact installed versions and preserve their required copyright/license notices; generated shadcn components remain reviewable local source.
- Apache ECharts: verify and satisfy Apache-2.0 notice/license requirements when introduced; preserve notices for redistributed code and document modifications where required.
- Storybook: verify and record the selected package licenses when introduced.
- Seed/workbook-derived data: preserve its internal provenance; do not mix third-party catalogue data or media into it without a separate source/license field.

M1 should add a `THIRD_PARTY_NOTICES.md` only if a new dependency or copied donor code actually requires it. A plan mentioning a donor does not itself justify copying code.

## 11. Prototype SQLite -> Vercel production database direction

### Recommendation

Supabase Postgres remains the best default from the approved options: managed PostgreSQL is compatible with Prisma and Vercel, provides backups/operations, and leaves a path to storage/realtime later. Use Supabase as the **database host**, not as a second auth system. This should be reconfirmed against pricing, region, pooling, backup, and point-in-time-recovery requirements immediately before provisioning because vendor offerings change.

### M1 database path

The checked-in Lift App SQLite database is disposable prototype data unless a later explicit instruction identifies real records that must be preserved. Back it up before schema work, but do **not** build a general SQLite-to-Postgres production migration utility in M1. The workbook export is the future source for historical training-data migration under `MIGRATION_SPEC.md`.

1. Back up `prisma/dev.db` as a prototype reference; record only enough counts/schema context to detect accidental reliance on it.
2. Finalize a clean PostgreSQL Prisma schema and create a baseline migration checked into `prisma/migrations/` (none exist today).
3. Provision separate preview/staging and production Supabase projects in the appropriate region.
4. Configure a runtime pooled `DATABASE_URL` suitable for Vercel/serverless and a direct `DIRECT_URL` for Prisma migrations/admin operations. Confirm the exact current Supabase/Prisma pooler parameters during implementation.
5. Apply migrations through CI/deployment using the direct URL; never run schema mutation opportunistically from an app request.
6. Seed clean development/test identities and the canonical athlete-owned Exercise Library rather than copying prototype accounts, sessions, programme rows, or logs.
7. Validate empty-database deployment, auth bootstrap, ownership constraints, and exercise seed idempotency in PostgreSQL.
8. Use ephemeral PostgreSQL (or isolated schemas/databases) in integration tests so production behavior is tested against the actual provider.

If stakeholders later identify irreplaceable SQLite records, stop and scope a separate, auditable one-off import before discarding them; that contingency is not part of M1. Historical workout import remains a later workbook migration and must preserve missing chronology/provenance according to the migration specification.

Do not use Vercel's filesystem or SQLite in a serverless function as durable storage. Do not enable Supabase Row Level Security as a substitute for application authorization without a deliberate design: Prisma's server connection can bypass or complicate per-request RLS context. For M1, enforce ownership in server services and database foreign keys; revisit defense-in-depth RLS separately.

## 12. One auth architecture

### Decision

Complete the already-started Better Auth direction and remove the custom parallel session path. Better Auth should own credential hashing, account/session persistence, expiration/rotation, and the secure HTTP-only cookie. Supabase supplies PostgreSQL only; **do not enable Supabase Auth for application login**.

### Required cleanup

- Add the Better Auth route handler and adapter-required schema according to the installed version's docs.
- Unless stakeholders identify real user accounts that require preservation before M1A begins, do not migrate prototype credentials or sessions. Establish clean Better Auth users/accounts/sessions on PostgreSQL.
- Remove the legacy password/session architecture, including passwords embedded in `Coach.bio` and `Athlete.notes`, rather than carrying prototype secrets forward.
- Replace the custom `UserSession` model and `lib/session.ts` flow; do not leave both active.
- Stop returning/storing session tokens in localStorage.
- Remove `x-coach-id` and `x-athlete-id` authorization fallbacks. Resolve the user/role/profile on the server from the session every time.
- Centralize `requireUser`, `requireCoach`, `requireAthlete`, and owner/coach-to-athlete authorization helpers.
- Preserve the role/profile model and invitation workflow, but make invite acceptance create one Better Auth user/account/session transactionally.
- Add CSRF/origin, cookie, rate-limit, and authorization tests appropriate to Better Auth and Next.js route handlers.

This is a foundation correction, not a second user-facing auth product. M1A must finish with one working Better Auth architecture; it must not leave the legacy custom session as a temporary parallel path. If real-account preservation is requested, stop M1A and agree a separate credential transition/reset plan before continuing.

## 13. Exact Milestone 1 implementation scope

Milestone 1 is split into three mandatory, sequential review gates. A submilestone is not permission to begin the next one: implement only the approved submilestone, present its diff and evidence, and **stop for human review**. M1B begins only after M1A is accepted; M1C begins only after M1B is accepted.

### M1A — Supabase Postgres + Better Auth + identity/authorization

1. Supabase/PostgreSQL-ready Prisma schema, baseline migration, environment contract, and Vercel-compatible pooled/direct connection configuration.
2. A clean Better Auth implementation on PostgreSQL, unless review first identifies real accounts that require a separately approved transition.
3. Removal of the competing custom `UserSession`, credential-in-profile, localStorage token/identity, and trusted identity-header paths.
4. Server-derived role/profile authorization helpers, including self-coached athlete access and assigned-coach-to-athlete access.
5. `Athlete.coachId`/relation made optional without weakening authorization.
6. Minimum profile/settings foundation needed for identity and later library ownership.
7. Authentication, session, role, self-coached athlete, assigned-coach, cross-athlete denial, migration, and production-build tests.

**M1A stop:** demonstrate clean PostgreSQL bootstrap and one auth/authorization architecture, then stop. Do not add the Exercise Library schema/API/UI in the same review unit.

### M1B — Exercise Library schema + seed + service/API

1. Canonical editable athlete-owned Exercise schema with stable IDs, mapped onto the physical `ExerciseTemplate` table where safe.
2. Code-level `ExerciseSlot` mapping onto the current physical `Exercise` table so naming is unambiguous without a destructive rename or ID regeneration.
3. Idempotent validation and per-athlete seeding of all 117 exercises from the manifest/parts, preserving incomplete legacy metadata and seed provenance.
4. Exercise normalization, validation, repository/service layer, and list/search/filter/create/edit/duplicate/archive/restore API contracts.
5. Explicit athlete ownership plus authorized assigned-coach management; no generic owner, global mutable library, or coach master catalogue.
6. Database-enforced normalized-name uniqueness, usage-safe archive/restore, and preserved existing slot references.
7. Unit/API/integration tests for seed counts, authorization, concurrent uniqueness, CRUD services, table mapping, and reference integrity.

**M1B stop:** demonstrate schema/seed/service/API evidence with no Exercise Library product UI, then stop for review.

### M1C — Exercise Library UI + CRUD + ExercisePicker + e2e

1. Mobile-first Exercise Library route with search, required filters, active/archived view, supported sorts, and loading/empty/error/saved states.
2. Create, edit, duplicate, archive, and restore interactions backed only by the approved M1B service/API.
3. Reusable accessible `ExerciseForm` and `ExercisePicker`, including an inline-create contract that returns/selects the new exercise ID without implementing Programme.
4. Selective shadcn/ui primitives and Lucide icons where useful, with required notices and PowerCoach styling/accessibility retained.
5. Component/accessibility tests and browser e2e covering self-coached athletes and authorized coach management.

**M1C stop:** demonstrate the complete Exercise Library UI and e2e evidence, then stop for review. Programme/TODAY/engine work remains unapproved.

### Explicitly out of scope

- Block builder changes, date generation, programme progression/deload, activation, or competition fit.
- TODAY runner changes, performed-set snapshot implementation, offline Dexie/outbox, prep, and readiness UI.
- RPE/e1RM/reference resolution, Double Progression, variation/dose/strength models, and analytics charts.
- Competition, drill library, full Setup/onboarding, historical workbook training-log import, PWA, Storybook, or external exercise-catalogue import.
- Milestone 2 or later even if a donor supplies a ready-made implementation.

## 14. Expected Milestone 1 file changes

Exact names may adjust to installed library conventions, but review should expect this footprint rather than broad unrelated rewrites.

The footprint is delivered incrementally: M1A owns database/auth/profile files; M1B owns exercise schema/seed/service/API files; M1C owns routes/components/e2e and any approved shadcn/ui or Lucide additions. A file needed by more than one gate is changed only as far as the active gate requires.

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
- `docs/powercoach/M1_DATABASE_RUNBOOK.md`
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
- Re-running seed for one athlete is idempotent; seeding a second athlete creates independent rows/IDs.
- Existing legacy library/slot references remain resolvable after migration.

### Domain/service tests

- Names are trimmed/normalized consistently; blank names and duplicate normalized names are rejected per athlete with a human-readable conflict.
- New custom exercises require equipment/movement metadata according to the final validation decision while legacy seed rows remain valid.
- Optional `seedRatio` stays null and is never coerced to `1`.
- Capability/default mode/progression eligibility/tier/load step validation covers valid bodyweight/time/null-load-step cases.
- Create, edit, duplicate, archive, and restore enforce athlete ownership and permit only the athlete or their currently assigned authorised coach.
- Duplicate gets a new stable ID/source and cannot reuse a normalized name.
- Editing or archiving a library exercise does not orphan, delete, or make unreadable any existing session/`ExerciseSlot` reference to that exercise.

### API/auth/integration tests

- Anonymous/cross-user/cross-athlete requests cannot read or mutate another user's library.
- Cookie session, expiration/logout, and role/profile resolution work without localStorage tokens or identity headers.
- List search covers name, movement pattern, progression group, and equipment; filters cover the specification; archived records are opt-in.
- Concurrent duplicate creates produce one success and one deterministic conflict via the database unique constraint.
- Invalid IDs/inputs return useful 4xx responses, not generic 500s.
- PostgreSQL baseline migration deploys from an empty database; no SQLite prototype-data import is required in M1.

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

The current repository has no test runner or checked-in Prisma migrations, so adding those foundations is part of M1A rather than evidence available today. PerformedSet immutability/snapshot behavior is deliberately absent from M1 acceptance because PerformedSet is outside M1; its acceptance tests belong to the later training-log milestone.

## 16. Contradictions and missing decisions

### Contradictions discovered

1. **Auth direction:** `BUILD_PLAN.md` says “Supabase auth and database,” while the handoff says not to replace working auth or keep two systems, and the repo already depends on Better Auth. Resolution proposed: Supabase database + Better Auth, no Supabase Auth. Human approval required.
2. **Auth implementation is already split:** `lib/auth.ts` configures Better Auth with a PostgreSQL adapter while Prisma declares SQLite; active routes use custom `UserSession`, and password hashes live in profile JSON. This is not one working architecture and must be resolved before production.
3. **Migration bundle mismatch:** `MIGRATION_SPEC.md` says migration `exercises.json`, `drills.json`, `rpe-grid.json`, and `training-log.json` are bundled. The repository currently contains only `README.md` and `system.json` under `data/powercoach/migration/`. The reported 325 history rows therefore cannot be imported or verified yet.
4. **Workbook extraction path mismatch:** `WORKBOOK_RULE_EXTRACTION.md` says the RPE table is already in `src/lib/powercoach/rpe.ts`; there is no `src/` tree or that module in this repo.
5. **Seed strategy mismatch:** the specification requires 117 athlete-owned rows under the approved ownership decision; current code lazily inserts a much smaller hard-coded global list and attaches custom records to coaches.
6. **Exercise required fields:** the Exercise Library spec calls `movement_pattern` required, then permits five legacy rows where both movement and equipment are blank. Resolution proposed: database nullable for migration fidelity, service validation conditional on `source`, and a review state.
7. **Exercise ownership/product persona:** the spec alternates “user” and “athlete,” while the current app is coach-led. This plan resolves the ambiguity for M1: the library belongs to an athlete; a currently assigned coach may be authorised to manage it; self-coached athletes require no coach; coach-owned templates/catalogues are later domains.
8. **Milestone naming:** `POWERCOACH_CODEX_HANDOFF.md` defines M1 as foundation + Exercise Library, while `BUILD_PLAN.md` calls all trustworthy-loop work “Phase 1.” Treat the handoff's narrower M1 as authoritative for the next implementation slice.
9. **Session start/completion:** current `SessionLog.completedAt` is required and populated when starting; the specification distinguishes live state from completion. Later migration must split these timestamps/states.
10. **Inline-create acceptance vs M1 boundary:** acceptance test 12 names Programme, but Programme is explicitly later. Resolution proposed: build/test the reusable picker callback/contract in M1, integrate it into Programme only in that milestone.

### Decisions resolved by review

1. Use Supabase-hosted PostgreSQL plus Better Auth; do not add Supabase Auth.
2. Make Exercise Library ownership athlete-centric (`athleteId`), permit explicitly authorised assigned-coach management, and support athletes with no coach.
3. Treat the checked-in SQLite database as disposable prototype data after backup; do not build a full SQLite production-data migration in M1. The workbook remains the future historical-training migration source.
4. Start clean Better Auth accounts/sessions unless real account preservation is explicitly requested before M1A; remove, rather than migrate by default, the competing custom session architecture.
5. Resolve model naming with Prisma `@@map`/`@map`: code-level library `Exercise` maps to physical `ExerciseTemplate`, and code-level `ExerciseSlot` maps to physical `Exercise`, preserving tables and IDs through M1.
6. Split M1 into mandatory sequential M1A, M1B, and M1C review gates, stopping after each.
7. Keep PerformedSet snapshot acceptance out of M1; prove library edits/archive preserve existing slot references instead.
8. Keep donor repositories as pattern/reference sources until licence verification; permit vetted shadcn/ui and Lucide primitives with required notices.

### Remaining choices that do not change the approved architecture

1. Supply the missing migration JSON files or revise `MIGRATION_SPEC.md` before the later workbook-history migration; this does not block M1.
2. Decide whether hard deletion of an unused custom exercise is wanted. Recommendation: omit it in V1; archive/restore is safer and sufficient.
3. Confirm normalized-name semantics (recommended: Unicode NFKC, trim, collapse whitespace, lowercase). Uniqueness is per athlete.
4. Confirm whether “Recently used” sort should be present but disabled until programme/history usage exists, or implemented from legacy slot references in M1C.
5. Confirm the initial deployment region, backup/PITR requirement, and preview database policy before provisioning Supabase in M1A.
6. Re-run donor source/licence review in a network-enabled environment before any direct adaptation. Until then, approve only independent pattern-inspired work plus vetted shadcn/ui and Lucide primitives.

## Review gate

This revision records the architecture decisions above but does not authorize implementation by itself. When implementation is approved, begin with M1A only and stop after its evidence for review; repeat that explicit approval/stop cycle for M1B and M1C. No Milestone 2 work is included.
