# Codex Handoff: Evolve Lift App into PowerCoach

This existing repository, `cyerifor/lift-app`, is the foundation for PowerCoach.

Do **not** create a separate application from scratch.

## Before changing code

Read these files in full:

0. `docs/powercoach/SPEC_INDEX.md`
1. `docs/powercoach/ENGINE_SPEC.md`
2. `docs/powercoach/DATA_MODEL.md`
3. `docs/powercoach/UI_UX_SPEC.md`
4. `docs/powercoach/WIREFRAMES.md`
5. `docs/powercoach/EXERCISE_LIBRARY_SPEC.md`
6. `docs/powercoach/EXERCISE_LIBRARY_SEED_AUDIT.md`
7. `docs/powercoach/WORKBOOK_RULE_EXTRACTION.md`
8. `docs/powercoach/MIGRATION_SPEC.md`
9. `docs/powercoach/QA_ACCEPTANCE_TESTS.md`
10. `docs/powercoach/BUILD_PLAN.md`
11. `docs/powercoach/DONOR_REPOS.md`

Then inspect the existing Lift App codebase and Prisma schema.

## Existing foundations to assess and preserve where appropriate

The current project already includes useful concepts such as:
- Next.js / React / TypeScript / Tailwind
- Prisma
- existing authentication/session implementation
- coach and athlete roles
- blocks and weeks
- sessions
- ExerciseTemplate
- session Exercise records
- SetPrescription
- SessionLog / SetLog
- feedback
- analytics

Do not replace working architecture merely because the PowerCoach scaffold once proposed a different library. The target architecture matters more than the earlier implementation choice.

In particular, do not keep two competing authentication systems. Audit the current auth implementation before deciding whether any auth migration is justified.

## Canonical PowerCoach rules

- `Block -> Session -> ExerciseSlot -> PlannedSet -> PerformedSet`
- Same exercise may appear multiple times in one session and must never collapse.
- Every TODAY set entry maps to one exact PlannedSet ID.
- Completed prescription snapshots are immutable.
- No future leakage in strength/prescription models.
- Structured rep/RPE/% fields are stored as structured values, not ambiguous strings.
- RPE-only and first Double Progression exposures are valid without a starting load.
- Bodyweight movements may be unweighted or externally loaded.
- Missing evidence remains missing. Never invent a variation ratio/reference.
- Coaching calculations belong in typed engine/service modules with tests, not duplicated UI logic.

## Seed and migration material

Current extracted seed data:
- `data/powercoach/seed/exercises.manifest.json` plus the four `exercises.part*.json` files listed in it, containing 117 exercises in total
- `data/powercoach/seed/drills.json`
- `data/powercoach/seed/rpe-grid.json`
- `data/powercoach/seed/engine-options.json`

Migration material is under:
- `data/powercoach/migration/`

The extracted exercise library is seed data, not hard-coded final application data. Users must be able to add, edit, duplicate, archive and restore exercises.

## Approved donor/reference projects

Inspect the projects listed in `docs/powercoach/DONOR_REPOS.md` before implementation. They are donor/reference repos only. PowerCoach's specification and canonical data model remain authoritative.

## Your first task: architecture/gap/reuse plan only

Before writing implementation code, return a plan containing:

1. What already exists in Lift App and should be retained.
2. What should be renamed/refactored for PowerCoach.
3. What must be replaced.
4. Required database schema changes.
5. Whether the existing `Exercise` entity should become/behave as `ExerciseSlot`, and the migration implications.
6. How `ExerciseTemplate` should evolve into the editable PowerCoach Exercise Library.
7. How existing `SetPrescription`, `SessionLog` and `SetLog` map to PlannedSet and PerformedSet.
8. Which donor-repo components/patterns are worth adapting.
9. Which donor-repo approaches should not be copied.
10. Licence/attribution obligations for proposed reuse.
11. The database path from current SQLite to a production database suitable for Vercel, including whether Supabase Postgres is still the best choice.
12. The auth architecture, explicitly avoiding two competing auth systems.
13. Exact implementation scope for Milestone 1.
14. Files expected to be created/changed in Milestone 1.
15. Tests that will prove Milestone 1 works.
16. Any contradictions or missing decisions discovered in the specification or existing repo.

Do not implement Milestone 2 or later.

Stop after this plan for human review.

## Milestone 1 after approval

Milestone 1 is foundation + editable Exercise Library:
- final production database direction and migration foundation
- auth/session foundation only insofar as changes are actually needed
- user/settings foundation required by the Exercise Library
- seed the PowerCoach exercise library
- exercise list/search/filter
- add exercise
- edit exercise
- duplicate exercise
- archive/restore exercise
- stable exercise IDs and historical safety
- metadata validation
- reusable inline-create exercise flow for future Programme use
- mobile-first UI

Do not begin Programme/TODAY/engine implementation until Milestone 1 has been reviewed and accepted.
