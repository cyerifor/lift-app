# Workbook -> Web Migration Specification

## Principle

The workbook is read-only source data. Migration may preserve imperfect legacy facts, but it must never fabricate missing chronology, mode or prescription metadata.

## Extracted source data already bundled

- `data/powercoach/migration/exercises.json` - 117 exercises
- `data/powercoach/migration/drills.json` - 13 prep drills
- `data/powercoach/migration/rpe-grid.json` - authoritative RPE table
- `data/powercoach/migration/system.json` - V7 engine thresholds / settings schema
- `data/powercoach/migration/training-log.json` - 325 historical set rows

The same clean seed library is also copied under `data/powercoach/seed/` for application bootstrapping.

## Training-log facts

Extracted rows: 325.

- 318 completed rows
- 7 incomplete/non-completed rows
- 188 rows have a usable performed timestamp
- 137 rows have no trustworthy performed timestamp
- 4 rows are marked PARTIAL migration records
- 3 rows are marked UNRESOLVED

These figures are migration context, not a reason to infer missing values.

## Exercise import

Map legacy exercise names to seeded exercise IDs by trimmed normalised name.

Rules:

1. trim whitespace
2. case-insensitive normalised matching
3. keep original legacy ID/name in migration metadata
4. if no match exists, create an imported archived/reviewable exercise rather than dropping history
5. never silently map two distinct legacy names to one exercise unless an explicit alias rule exists

## Training history import

For every legacy set:

- create a migrated `performed_set`
- preserve migration source
- preserve raw source load text where available
- preserve outcome
- preserve existing snapshot facts where trustworthy
- `planned_set_id = null` when there is no reliable historical planned-set identity

### Dated rows

Dated, resolved completed rows may participate in chronology-dependent models when they meet each model's eligibility rules.

### Undated rows

Undated history remains visible in exercise history / records but is excluded from:

- rolling chronological e1RM
- previous-session lookup
- variation pairing
- recovery-days calculation
- productive-dose response calculation

Do not fabricate dates from row order.

### UNRESOLVED rows

Keep visible in migration review/history. Exclude from load-dependent modelling until explicitly corrected.

## Migrated Double Progression

If legacy rows do not have a trustworthy `SnapMode = Double Progression`, do not infer DP status.

The UI can say:

`No PowerCoach Web double-progression baseline yet.`

while still showing ordinary exercise history.

## Starting settings

`system.json` contains schema keys but the extracted workbook copy may not contain the athlete's current values. The app onboarding/settings UI is the source of truth for current settings.

## Reference lifts

Do not infer the active reference exercise merely from progression-group labels during migration.

Prompt/select explicitly during onboarding:

- Squat reference
- Bench reference
- Deadlift reference

## Seed ratios

Import workbook `defaultRatio` only when non-null.

Null remains null. Never coerce to 1.0.

## Corrections

Historical corrections should be auditable.

Recommended future table:

- correction id
- performed set id
- field
- raw value
- corrected value
- reason
- confirmed at

Do not edit imported raw provenance away.

## Migration acceptance

- total imported legacy rows matches source count
- every imported row has provenance
- unresolved rows are not used by load-dependent models
- undated rows are not used by chronological models
- exercise names are trimmed
- no history disappears because an exercise is archived
- migration can be re-run in a dry-run/idempotent mode without duplicating rows
