# PowerCoach: Start Here

This repository (`cyerifor/lift-app`) is the existing application chassis that will be evolved into **PowerCoach**.

Do **not** create a second app from scratch and do **not** overwrite working Lift App features blindly.

## First action for any coding agent

Read, in order:

1. `POWERCOACH_CODEX_HANDOFF.md`
2. `docs/powercoach/SPEC_INDEX.md`
3. the documents referenced by that index
4. `docs/powercoach/DONOR_REPOS.md`

Then audit the existing Lift App against the PowerCoach specification before editing code.

## Existing app is valuable

The current repo already contains useful foundations including Next.js, React, TypeScript, Tailwind, Prisma, authentication/session code, coach/athlete roles, blocks, weeks, sessions, exercises, set prescriptions, set logs, feedback and analytics.

Preserve good working code where it fits the PowerCoach specification. Refactor rather than rewrite when practical.

## PowerCoach source of truth

The PowerCoach specification under `docs/powercoach/` overrides incomplete or contradictory legacy Lift App behaviour and incomplete spreadsheet behaviour.

The workbook was a prototype and domain-discovery tool. Do not recreate spreadsheet mechanics such as cache sheets, cell-address identity or free-text date-like tokens.

## Canonical training identity

`Block -> Session -> ExerciseSlot -> PlannedSet -> PerformedSet`

This is non-negotiable. The same exercise may appear more than once in one session without collapsing.

## Build strategy

Work milestone by milestone. Do not attempt the entire product in one run.

Milestone 1 is foundation + editable Exercise Library only. Before implementation, produce the architecture/gap/reuse plan required in `POWERCOACH_CODEX_HANDOFF.md` and stop for review.
