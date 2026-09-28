# PowerCoach Engine Specification

## 1. Purpose

PowerCoach is a strength-programming and training-log application. The engine must turn structured prescriptions and historical training into transparent load guidance without rewriting history or leaking future information into past decisions.

The engine is deterministic. The UI may explain its outputs in plain English, but coaching values come from typed engine functions and persisted data, not from duplicated UI calculations.

## 2. Non-negotiable invariants

1. Canonical identity is:
   `Block -> Session -> ExerciseSlot -> PlannedSet -> PerformedSet`.
2. Two prescriptions for the same exercise in one session are distinct slots.
3. Every live set entry maps to one exact `planned_set_id`.
4. Completed prescription snapshots are immutable.
5. Chronological calculations use explicit session dates, never table order.
6. A prescription for a future session may only use information available before that session.
7. Current reporting may use the newest valid completed exposure.
8. Missing evidence is represented as missing evidence, never as a fabricated 1.0 ratio, reference strength or load.
9. RPE-only and Double Progression first exposures are valid without a starting load.
10. Bodyweight movements may be unweighted or externally loaded.
11. Canonical numerical data is structured. Strings like `8-12` are presentation/import tokens only.
12. UI code never contains a second copy of coaching maths.

## 3. Core entities

### Athlete profile

- display name
- display units: kg or lb
- canonical load storage: kg
- current bodyweight
- default load step
- sessions per week
- ordered training days
- readiness enabled
- prep focus areas
- prep time budget
- selected reference exercise for Squat / Bench / Deadlift

### Competition

- id
- name
- date
- weight class
- priority 1 High / 2 Medium / 3 Low
- peak weeks
- taper weeks
- status
- notes

### Block

- id
- linked competition optional
- name
- phase
- start date
- weeks
- sessions per week
- deload type
- intensity trend
- volume trend
- apply progression
- status
- frozen timestamp

### Session

- id
- block id
- week
- session code
- planned date
- training day
- name
- status

### Exercise slot

One prescription instance in one session.

- id
- session id
- order in session
- exercise id
- set type
- mode
- capability override
- set count
- structured rep prescription
- structured RPE prescription
- structured percentage prescription
- fixed load where relevant
- resolved reference strength
- resolved load suggestion/reason
- notes

### Planned set

- id
- exercise slot id
- set number
- status

### Performed set

- id
- planned set id optional for migrated/ad-hoc work
- session id
- exercise id
- performed timestamp
- external load
- reps or seconds
- RPE
- outcome
- notes
- immutable prescription snapshot

## 4. Enumerations

### Parent lift

- Squat
- Bench
- Deadlift
- Other / none

### Capability

- `LOADED_REPS`
- `BODYWEIGHT_REPS`
- `WEIGHTED_BODYWEIGHT`
- `TIME`
- legacy/import support for `AMRAP`; in new programmes AMRAP is preferably a rep scheme rather than a separate measurement capability

Bodyweight rule:

`BODYWEIGHT_REPS` means the movement is bodyweight-centred and external load is optional. A particular slot can override to `WEIGHTED_BODYWEIGHT` when added load is part of the prescription. Therefore one Pull-Up exercise can support both unweighted and weighted sessions.

### Prescription mode

- `% e1RM`
- `% + RPE`
- `RPE`
- `Double Progression`
- `Fixed Load`
- `Rep Target`
- `Bodyweight`
- `Time`
- `Manual`

### Rep scheme

- FIXED
- RANGE
- AMRAP

### Set type

Seed choices from the workbook:

- Top Set
- Back-off
- Volume
- Variation
- Hypertrophy Accessory
- Strength Accessory
- Conditioning
- Core
- Prehab
- Mobility
- Cooldown
- Rehab

The database may store set type as text so later custom types can be added without a migration.

## 5. Authoritative RPE table

Use the exact migrated PowerCoach table.

| RPE | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 7.0 | .87 | .85 | .83 | .81 | .79 | .76 | .73 | .70 |
| 7.5 | .89 | .86 | .84 | .82 | .80 | .775 | .745 | .715 |
| 8.0 | .91 | .87 | .85 | .83 | .81 | .79 | .76 | .73 |
| 8.5 | .93 | .89 | .86 | .84 | .82 | .80 | .775 | .745 |
| 9.0 | .95 | .91 | .87 | .85 | .83 | .81 | .79 | .76 |
| 9.5 | .97 | .93 | .89 | .86 | .84 | .82 | .80 | .775 |
| 10.0 | 1.00 | .95 | .91 | .87 | .85 | .83 | .81 | .79 |

Rules:

- supported reps: 1-8
- supported RPE: 7-10 in 0.5 steps
- no extrapolation outside the table in V1
- `e1RM = load / table_percentage`

## 6. Starting strength

For each parent lift, the user may enter a recent representative set:

- load
- reps
- RPE

If the set is supported by the RPE table:

`seed_e1rm = load / RPE_percentage(reps, rpe)`

Never use raw load as an e1RM.

The user also chooses a reference exercise for each parent lift. Seed strength belongs to that selected reference context.

## 7. Load rounding

Priority:

1. exercise-specific load step if set
2. athlete default load step
3. no rounding where neither is meaningful

`round_to_step(load, step) = round(load / step) * step`

Do not execute step division when step is null/zero.

Bodyweight/time prescriptions may legitimately have no rounding step.

## 8. Token migration / structured prescriptions

The web UI does not need free-text tokens for normal programming.

Examples:

- `8-12` -> `{rep_min: 8, rep_max: 12, rep_scheme: RANGE}`
- `5` -> `{rep_min: 5, rep_max: 5, rep_scheme: FIXED}`
- `AMRAP` -> `{rep_scheme: AMRAP}`
- `7.5-8` -> `{rpe_min: 7.5, rpe_max: 8}`
- `<=8` -> `{rpe_cap: 8}`
- `70-75%` -> `{pct_min: .70, pct_max: .75}`

Token parsers exist only for migration, paste/import and convenience text entry.

## 9. Reference-strength hierarchy

For a programmed exercise, resolve in this order:

1. direct recent exercise e1RM
2. learned variation ratio x current selected parent reference e1RM
3. user/library seed ratio x current selected parent reference e1RM
4. selected reference-lift e1RM when the programmed exercise itself is that selected reference exercise
5. no numerical reference

Never treat a missing variation ratio as 1.0.

Return both value and source:

- DIRECT
- LEARNED_VARIATION
- SEED_RATIO
- REFERENCE_LIFT
- NONE

The UI should expose the source in the `Why` explanation.

## 10. Prescription resolver

### `% e1RM`

Requires:

- numerical reference e1RM
- percentage target/range

Calculate:

- load_min = reference x pct_min
- load_max = reference x pct_max
- round each using applicable load step
- suggested load defaults to rounded midpoint unless product behaviour later chooses a lower/upper bias

If no reference exists, the prescription is incomplete because this mode fundamentally requires a percentage of a reference.

### `RPE`

If a numerical reference exists and the target reps/RPE are supported by the RPE grid:

For a fixed rep/RPE target:

`load = reference_e1rm x RPE_percentage(reps, rpe)`

For ranges, calculate a permissible band:

- lower load: higher reps + lower RPE
- upper load: lower reps + higher RPE

Round with the applicable load step.

If no reference exists:

- prescription is still valid
- suggested load = null
- `requires_user_selected_load = true`
- explanation: `First exposure: choose a load that achieves the prescribed RPE. This will establish your baseline.`

If RPE/reps are outside the numerical grid, the prescription can still be executed by feel, but PowerCoach must not fabricate a numerical suggestion.

### `% + RPE`

Both constraints matter.

1. compute percentage load interval
2. compute RPE load interval
3. take interval intersection
4. if overlap exists, choose a rounded load inside the intersection
5. if no overlap, return `CONSTRAINT_CONFLICT`; do not silently choose one constraint

This mode requires a numerical reference. If the RPE side cannot be numerically resolved, show that the RPE execution target remains valid but no fully constrained numerical suggestion can be guaranteed.

### `Double Progression`

First exposure:

- valid without previous load
- user chooses a load that permits the rep range inside the RPE cap

Comparable history:

- same exercise
- mode Double Progression
- completed session strictly before target session
- use immutable snapshot of the prior prescription

Decision rules:

- FIRST_EXPOSURE: no comparable completed exposure
- INCREASE: all prescribed sets completed, every set reaches `rep_max`, and where an RPE cap exists every set has a recorded RPE at/below cap
- REDUCE: latest exposure failed AND the immediately previous comparable exposure also failed
- HOLD: all other cases

Failure:

- any set below `rep_min`, or
- any recorded RPE above cap

Load action:

- INCREASE: previous representative load + one load step
- HOLD: previous representative load
- REDUCE: previous representative load - one load step, floor at zero

Representative load defaults to median completed-set load for the exposure.

### `Fixed Load`

Requires fixed load. Suggested load equals fixed load.

### `Rep Target`

No automatic numerical load is required unless the slot separately supplies one. The user selects load/implementation appropriate to the exercise and target.

### `Bodyweight`

No mandatory external load. Added load is optional if the exercise/slot supports it.

### `Time`

Primary completion field is duration. Do not run e1RM or load-rounding logic unless the particular slot explicitly contains a meaningful external load.

### `Manual`

Valid, no automatic load suggestion.

## 11. Completion rules

Default completion requirements:

- LOADED_REPS: load + reps
- BODYWEIGHT_REPS: reps; external load optional
- WEIGHTED_BODYWEIGHT: external added load + reps
- TIME: seconds
- AMRAP: completed reps; load according to the underlying exercise/load state

RPE is required only when the prescription requires it or when a model decision (for example DP cap compliance) needs it.

## 12. Session generation

Inputs:

- block start date
- ordered athlete training days
- sessions per week
- block weeks

Rule:

- `start_date` represents the first planned session date
- generate the configured training-day occurrences sequentially from that date
- group every `sessions_per_week` generated sessions into the next programme week
- every generated session receives a unique ID and explicit planned date

The builder must preview generated dates before block activation.

## 13. Weekly progression

### Percentage modes

Default trend step from workbook:

- Linear Up: +0.025 absolute percentage per week step
- Linear Down: -0.025
- Flat: 0

### RPE modes

Corrected V1 default:

- Linear Up: +0.5 RPE per week step
- Linear Down: -0.5
- Flat: 0

Bound within allowed RPE scale.

### Volume

Workbook default:

- Linear Up factor: `1.1^(week-1)`
- Linear Down factor: `0.9^(week-1)`
- Flat: 1
- sets rounded to whole sets, minimum 1

### Modes that should not receive artificial trend progression

- Double Progression: progression comes from performance
- Fixed Load: hold fixed load unless user edits it
- Manual: no invented progression
- Bodyweight/Rep Target/Time: only progress if a mode-specific rule is explicitly defined

## 14. Deload

Semantics:

- None: volume unchanged, intensity unchanged
- Volume: volume reduced only
- Intensity: intensity reduced only
- Both: both reduced

Default constants:

- volume factor: 0.50
- percentage intensity delta: -0.05
- RPE intensity delta: -1.0

These constants belong in the engine configuration, not duplicated in UI code.

## 15. Exposure model

An exposure is one exercise in one completed session for analytical purposes.

If the same exercise has a top-set slot and back-off slot in the same session, those remain separate prescription slots but are aggregated into one exercise/session exposure for strength/dose modelling.

Per exposure derive:

- completed set count
- total reps
- tonnage = sum(external_load x reps) for loaded work where this definition is meaningful
- qualifying set e1RMs
- exposure e1RM = median qualifying set e1RM
- mean RPE
- max RPE
- benchmark performed set optional

Do not label every completed set a `hard set` until an explicit hard-set definition exists. Use `completed_sets` in V1 analytics.

## 16. Strength model

### Qualifying set

- completed/resolved
- positive load
- reps between configured min/max, default 1-8
- RPE between configured min/max, default 7-10
- exact RPE grid entry exists
- valid chronological timestamp when used in chronological models

### CURRENT estimate

Median of the last 4 qualifying exercise exposures as of now.

### BEFORE_SESSION estimate

Median of the last 4 qualifying exercise exposures whose session date is strictly before the target session date.

No future leakage.

### Confidence

The V7 workbook's generic 12/20 observation thresholds are not coherent with a rolling window of four for strength. V1 should show exposure count (`n/4`) rather than fake a HIGH/MODERATE strength confidence label. Confidence thresholds remain meaningful for variation/dose models.

## 17. Variation model

A variation relationship is learned against the athlete's selected reference exercise for that parent lift.

Pair construction:

- variation estimate must be dated
- reference estimate must be dated
- choose the closest appropriate reference estimate inside a configurable pairing window
- never pair with a future estimate that would create temporal leakage for a historical decision

`pair_ratio = variation_e1rm / reference_e1rm`

Learned ratio:

- median of valid pair ratios

Fields:

- variation exercise
- reference exercise
- pair count
- learned ratio
- confidence

Minimum actual pairs before T2 dose contribution: 8.

Pair-window duration is an engine configuration value and should not be hidden in UI formulas. Until product validation chooses a final number, keep it configurable and documented.

## 18. Dose contribution model

Tier rules:

- T1: selected parent reference/competition lift; weight 1.0
- T2: progression-eligible variation with >= 8 valid pairs; weight learned ratio
- T3: progression-eligible variation with < 8 pairs; weight 0 and tracked separately
- T4: non-contributing exercise; weight 0

For each eligible exposure:

`weighted_relative_dose = relative_dose x contribution_weight`

All parent-lift dose analytics use weighted relative dose.

The existing workbook's `RelTonnage` concept can be retained as a normalised dose feature, but its definition must be explicit in code and tests.

## 19. Productive dose model

Not required for the first training-loop release.

When implemented, a productive observation requires:

1. dose in a defined period
2. sufficient chronological recovery window
3. a later comparable strength estimate
4. `next_change_pct`
5. response classification

Never use historical min/max dose and label it productive.

Suggested response states:

- POSITIVE
- NEUTRAL
- NEGATIVE
- INSUFFICIENT_DATA

Productive range should use a robust percentile/central range of positive/acceptable observations, not absolute extremes.

## 20. Intensity distribution

For eligible loaded performed sets with a trustworthy reference:

`relative_intensity = load / reference_e1rm`

Allocate actual reps into:

- <70%
- 70-80%
- 80-90%
- 90%+

Use consistent non-overlapping boundaries in code. Exclude sets without a valid reference.

## 21. Prep engine

Inputs:

- session primary parent lift
- user's prep focus areas
- time budget
- active drill library

Candidate rules:

- relevant_to is session parent lift or All
- target or secondary area matches chosen focus area when focus areas are set

Deterministic selection:

- score exact target-area match above secondary-area match
- prefer session-lift-specific drill above All when otherwise equal
- then stable library/user priority order
- select while cumulative minutes fit the budget

Persist selected drills on the session so changing the library later does not silently rewrite today's prep.

## 22. Competition phase / block-fit engine

For a linked competition:

- days_out = competition_date - today
- weeks_out = days_out / 7
- TAPER if weeks_out <= taper_weeks
- PEAK if weeks_out <= taper_weeks + peak_weeks
- BASE otherwise

Block-fit validation:

- projected block end date must be compared with competition date and phase window
- if a 5-week block is proposed with only 2 weeks available, warn before activation
- warnings inform; the athlete can deliberately override with explicit confirmation if the product allows it

## 23. Warm-up calculator

Given working load and load step:

- 40% x 5
- 55% x 5
- 70% x 3
- 80% x 2
- 90% x 1

Round loads to the relevant step.

## 24. Historical immutability

When a planned set is first completed, freeze into the performed record:

- mode
- set type
- capability
- prescribed set count
- rep min/max/scheme
- RPE min/max/cap
- percentage min/max
- reference e1RM/source
- suggested load
- resolution reason

Subsequent edits to the exercise library, reference lift, programme or engine settings do not rewrite this snapshot.

## 25. Engine lifecycle

A completed/edited performed set marks derived models stale.

V1 can rebuild synchronously for the affected athlete after a logging transaction, provided logging remains fast. If the model grows, move derived rebuilds to a queued/server task.

Dependency order:

1. performed sets
2. exposures
3. current/before-session strength estimates
4. variation pairs/models
5. dose observations
6. next-session prescription resolution
7. dashboard/progress read models

The UI should know whether analytics are current and display stale state rather than silently mixing old/new values.
