# PowerCoach Web Specification Index

This repository is the handoff package for building PowerCoach as a real web application. The V7 workbook was used to extract domain rules, seed data and edge cases. The web app must not reproduce spreadsheet mechanics such as `_CACHE`, cell-address identity or free-text date-like tokens.

## Source of truth order

When documents overlap, use this order:

1. `ENGINE_SPEC.md` - coaching maths, chronology and model behaviour
2. `DATA_MODEL.md` - relational entities, identities, history and persistence
3. `UI_UX_SPEC.md` - product behaviour and interaction design
4. `EXERCISE_LIBRARY_SPEC.md` - editable exercise library and bodyweight behaviour
5. `WIREFRAMES.md` - information hierarchy and responsive layouts
6. `EXERCISE_LIBRARY_SEED_AUDIT.md` - extracted library counts and legacy rows needing review
7. `WORKBOOK_RULE_EXTRACTION.md` - what was extracted from each workbook section and what was corrected/discarded
8. `MIGRATION_SPEC.md` - importing V7 data without polluting chronological models
9. `QA_ACCEPTANCE_TESTS.md` - definition of done
10. `BUILD_PLAN.md` - implementation sequence

`POWERCOACH_SPEC.md` is a short product overview only. It does not override the documents above.

## Seed data

- `data/powercoach/seed/exercises.manifest.json` - manifest for all 117 extracted exercises
- `data/powercoach/seed/exercises.part1.json` through `exercises.part4.json` - complete exercise seed library
- `data/powercoach/seed/drills.json` - 13 prep drills
- `data/powercoach/seed/rpe-grid.json` - authoritative PowerCoach RPE grid
- `data/powercoach/seed/engine-options.json` - workbook option lists used as product vocabulary

The exercise library is seed data, not hard-coded application data. On first-user setup it should be copied into user-owned exercise rows so the athlete can add, edit, duplicate, archive and restore exercises.

## Canonical architecture

`Block -> Session -> ExerciseSlot -> PlannedSet -> PerformedSet`

This identity chain is non-negotiable. It exists specifically to prevent the workbook bug where two prescriptions for the same exercise collapsed into one.

## First Codex task

Read `../../POWERCOACH_CODEX_HANDOFF.md`. First produce the requested architecture/gap/reuse plan and stop for review. Only implement **Milestone 1** after approval.
