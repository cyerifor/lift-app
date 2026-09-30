# M2B Programme foundation

M2B introduces the canonical persisted chain `Block -> Session -> ExerciseSlot -> PlannedSet` while preserving the physical `Exercise` and `SetPrescription` tables. Programme writes now go through `ProgrammeService`; the legacy coach block routes are compatibility aliases and no longer invoke `lib/engine.ts`.

A self-coached athlete's block has a null `coachId`. An assigned coach's ID is derived from the authenticated Better Auth profile. All reads and writes use the existing `canManageAthlete` policy, and exercise attachment verifies athlete ownership.

`startDate` is the first session occurrence. Ordered athlete training days generate exactly `weekCount * sessionsPerWeek` dated sessions, grouped by sequential occurrences rather than calendar weeks. Every slot owns one stable PlannedSet row per set number.

Block activation is deliberately deferred: M2B creates and edits DRAFT blocks only. Consequently, the one-ACTIVE-block invariant is not partially implemented here; a later activation operation must enforce it transactionally. Performed-set preservation, TODAY, logging, strength calculation, progression calculation, and recommendations remain outside M2B.
