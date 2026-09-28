# PowerCoach workbook extraction -> web application

This document records what is worth carrying forward from `PowerCoach_V7_2`, what should be corrected, and where it belongs in the web product. The workbook is now a source of domain rules and migration data, not the runtime architecture.

## Source workbook inventory

Visible sheets:

- HOME
- PLAN
- PROGRAMME
- TODAY
- PROGRESS
- SETUP
- MORE
- EXERCISE LIBRARY
- DRILL LIBRARY
- TOOLS

Backend sheets:

- _LISTS
- _SYSTEM
- _RPE_TABLE
- _EXERCISES
- _DRILLS
- _COMPETITIONS
- _BLOCKS
- _BLOCK_CONFIG
- _PROGRAMME
- _SESSIONS
- _TRAINING_LOG
- _EXPOSURES
- _STRENGTH_MODEL
- _VARIATION_MODEL
- _DOSE_MODEL
- _MIGRATION_CORRECTIONS
- _PREP_MODEL
- _CACHE

## HOME -> Dashboard

Workbook intent:

- show current block and phase
- show current rolling e1RM for squat, bench and deadlift
- show next session and its exercises
- show this week's session count, adherence and parent-lift dose
- show a compact progress snapshot
- surface engine warnings rather than inventing coaching advice in the UI

Web mapping:

- `/` Dashboard
- all current-block cards query one explicit active `block_id`
- next session resolves one exact `session_id`
- strength cards use CURRENT strength estimates for the selected reference exercises
- adherence is scoped to the active block only
- attention cards are structured engine states, not free-form generated claims

Do not port:

- workbook cache formulas
- current week derived from a UI selector
- adherence across all historic sessions
- weeks-out chosen from an unrelated competition

## SETUP -> Settings / onboarding

Workbook fields:

- athlete name
- units: kg / lb
- bodyweight
- default load step
- starting strength for Squat / Bench / Deadlift: load, reps, RPE
- sessions per week
- readiness tracking yes/no
- training days
- three prep focus areas
- prep time budget

Engine thresholds extracted from `_SYSTEM`:

- e1RM reps: 1-8
- e1RM RPE: 7-10
- rolling exposure window: 4
- minimum pairs before a personal dose range is claimed: 8
- variation pairs before a variation can contribute learned parent dose: 8
- dose confidence moderate: 12 observations
- dose confidence high: 20 observations

Corrected web behaviour:

- starting strength is converted to a true seed e1RM with the authoritative RPE grid
- the user explicitly selects Squat, Bench and Deadlift reference exercises
- training days generate actual dated sessions
- readiness toggle controls whether readiness inputs are shown and stored
- canonical loads are stored in kg; display can be kg or lb

## PLAN -> Competition planner

Workbook fields:

- competition name
- date
- federation
- class
- priority
- status
- peak weeks
- taper weeks
- notes
- days out
- weeks out
- current window

Web decisions:

- federation is not required for V1
- priority becomes 1 High, 2 Medium, 3 Low
- status: PLANNED / COMPLETED / CANCELLED
- peak and taper are separate durations

Phase window rule:

```text
if competition already passed -> COMPLETED
else if weeks_out <= taper_weeks -> TAPER
else if weeks_out <= taper_weeks + peak_weeks -> PEAK
else -> BASE
```

PLAN must influence PROGRAMME enough to prevent contradictions. If a proposed block does not fit before a linked competition, warn before activation.

## PROGRAMME -> Block + programme builder

Workbook block controls:

- block name
- competition
- phase
- weeks
- sessions per week
- deload: None / Volume / Intensity / Both
- intensity trend: Flat / Linear Up / Linear Down
- volume trend: Flat / Linear Up / Linear Down
- progression on/off
- start date

Workbook per-prescription fields:

- week
- session code
- exercise
- set type
- sets
- reps
- mode
- percentage
- RPE
- suggested load
- notes

Workbook modes:

- % e1RM
- % + RPE
- RPE
- Double Progression
- Fixed Load
- Rep Target
- Bodyweight
- Time
- Manual

Workbook set types:

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

Web correction:

Do not store rep/RPE/% tokens as spreadsheet-like strings. The web UI can render `8-12`, but canonical data is structured:

```text
rep_min = 8
rep_max = 12
rpe_min = 7.5
rpe_max = 8
pct_min = 0.70
pct_max = 0.75
```

`AMRAP` is stored as a rep scheme, not as a number.

The same exercise may appear multiple times in one session. Every prescription instance is an `exercise_slot` with its own ID and order.

### Workbook progression defaults worth carrying forward

Percentage intensity trend:

- Linear Up: +2.5 percentage points per week from week 1
- Linear Down: -2.5 percentage points per week
- Flat: unchanged

Volume trend:

- Linear Up: previous week-equivalent sets multiplied by 1.1 per step, rounded to a whole set, minimum 1
- Linear Down: multiplied by 0.9 per step, rounded to a whole set, minimum 1
- Flat: unchanged

Corrected RPE trend:

- Linear Up: +0.5 RPE per week
- Linear Down: -0.5 RPE per week
- bounded to valid RPE limits
- Double Progression does not receive artificial weekly RPE progression

Corrected deload semantics:

- None: no automatic change
- Volume: reduce volume only
- Intensity: reduce intensity only
- Both: reduce both

Default deload values inherited/corrected from the workbook:

- volume reduction factor: 0.50
- percentage intensity reduction: 5 percentage points
- RPE intensity reduction should be an engine constant, default 1.0 RPE, not a hard-coded UI formula

## TODAY -> Training session runner

Workbook intent:

- select block / week / session
- optional bodyweight, sleep and readiness check-in
- show prep summary
- show each exercise prescription
- show Target, Today, Why and Last time
- log set load, reps/time and RPE
- save immediately

Web mapping:

- `/today` defaults to the exact next planned `session_id`
- session switcher remains available
- each card is keyed by `exercise_slot.id`, never by exercise name
- each set row carries the exact `planned_set.id`
- saving a set writes/upserts only that planned set
- completed prescription facts are snapshotted and immutable
- no fixed eight-exercise/six-set layout; cards are dynamic

Capability-aware input:

- LOADED_REPS: load + reps + optional/required RPE according to prescription
- BODYWEIGHT_REPS: reps + RPE, external load optional
- WEIGHTED_BODYWEIGHT: external added load + reps + RPE
- TIME: seconds + optional RPE; load only if the specific prescription explicitly supports it
- AMRAP: rep count entered when completed; optional load according to exercise capability

Bodyweight is not synonymous with unloaded. The same Pull-Up exercise may be prescribed unweighted in one slot and with external load in another. The slot capability can override the library default.

Previous exposure means the same exercise in a completed session strictly before the current session. The current session is never "Last time".

## PROGRESS -> Analytics

Workbook sections:

- current strength
- strength development chart
- current block summary
- training dose
- planned vs performed
- productive dose
- intensity distribution
- variation relationships
- block comparison

Preserve the product ideas, not the broken formulas.

### Strength development

Use rolling CURRENT estimates for charts and separate BEFORE_SESSION estimates for prescription. The workbook correctly established the need for chronological isolation but mixed reporting and prescription concepts.

### Training dose

Parent-lift dose must use weighted contribution, not simply count all rows whose parent is Squat/Bench/Deadlift.

### Planned vs performed

Both sides must use the same metric and active block scope.

### Productive dose

Do not call historical min/max "productive". A productive observation requires a dose followed by a later measurable response. This is a later engine phase and should display `INSUFFICIENT DATA` until evidence exists.

### Intensity distribution

Use actual reps in each relative-intensity band when a valid reference exists:

- <70%
- 70-80%
- 80-90%
- 90%+

Sets with no trustworthy reference are excluded, not forced into a band.

### Variation relationships

Display learned ratio, pair count, confidence, dose tier and treatment. Pair count must be real historical pairs.

## MORE -> Secondary navigation / help

Workbook intent:

- keep exercise library, drill library, calculators and guidance away from primary training surfaces
- explain the basic workflow
- explicitly state that PowerCoach reports associations in the user's history, not causal claims

Web mapping:

- desktop sidebar / mobile settings-more menu
- About / How PowerCoach works page
- Libraries
- History
- Tools
- Settings

## TOOLS -> Utility calculators

### RPE / e1RM calculator

Authoritative behaviour:

- RPE grid contains RPE 7.0-10.0 in 0.5 steps
- reps 1-8
- no extrapolation outside the table
- e1RM = load / table percentage

The workbook displayed `MANUAL_LOAD_REQUIRED` outside the grid. The web UI should instead say that a numerical e1RM is unavailable outside the supported grid.

### Warm-up calculator

Workbook warm-up ladder:

| Step | % of working load | Reps |
|---|---:|---:|
| 1 | 40% | 5 |
| 2 | 55% | 5 |
| 3 | 70% | 3 |
| 4 | 80% | 2 |
| 5 | 90% | 1 |

Loads are rounded to the applicable load step.

This is a utility, not part of the core prescription engine.

## EXERCISE LIBRARY -> Editable exercise database

Workbook columns:

- ID
- Exercise
- Main Lift
- Category
- Progression Group
- Pattern
- Equipment
- Progresses?
- Rounding
- Tier
- Rest
- Capability
- Default Mode
- Parent Lift
- Ratio
- Active

The extracted seed contains 117 active exercises.

Web requirements are defined in `EXERCISE_LIBRARY_SPEC.md`.

## DRILL LIBRARY -> Editable prep drill database

Workbook columns:

- DrillID
- Name
- TargetArea
- SecondArea
- RelevantTo
- PrepType
- Sets
- RepsOrTime
- Minutes
- Cue
- Active

The extracted seed contains 13 drills.

## _RPE_TABLE -> Authoritative RPE chart

Source: workbook label `POWERCOACH_RPE_V1 (Helms et al. 2016 Table 2)`.

No interpolation or extrapolation is required for V1. Supported rows are 7, 7.5, 8, 8.5, 9, 9.5 and 10. Supported reps are 1-8.

The exact table is already in `data/powercoach/seed/rpe-grid.json` and `src/lib/powercoach/rpe.ts`.

## _PROGRAMME -> Canonical planned prescription

Workbook already established most of the right concepts:

- PlanSetID
- BlockID
- Week
- SessionCode
- OrderInSession
- SetNumber
- ExerciseID
- SetType
- Mode
- Capability
- rep / RPE / percentage parsed fields
- reference e1RM and source
- variation ratio
- load band / suggestion / reason
- status
- notes

Web correction:

Split the workbook row into:

`session -> exercise_slot -> planned_set`

An exercise slot is the prescription instance. Planned sets are children of the slot. This makes same-exercise top-set/back-off prescriptions unambiguous.

## _SESSIONS -> Chronology authority

Carry forward:

- SessionID
- BlockID
- Week
- SessionCode
- planned date
- day
- name
- bodyweight / sleep / readiness check-in
- status

The web app must generate valid dates from the user's chosen training days. Row order is never chronology.

## _TRAINING_LOG -> Performed-set history

Carry forward the immutable snapshot idea.

Each completed set stores:

- exact planned set if one exists
- session and exercise
- performed timestamp
- capability
- actual external load
- reps or seconds
- actual RPE
- outcome
- notes
- snapshot of mode, set type, rep range, RPE target/cap, percentage range, reference e1RM/source and suggested load

Once a snapshot exists it is not rewritten by later programme edits.

Historical corrections should be explicit rather than silently rewriting source data.

## _EXPOSURES -> Derived per-session exercise exposure

Workbook intent: one row per exercise per session.

Web definition:

- aggregate all completed slots for the same exercise in the same session for analytical purposes
- programming identity remains slot-specific
- exposure e1RM = median of qualifying set e1RMs in that exercise/session
- store completed sets, reps, tonnage, relative dose, mean RPE, max RPE and benchmark set where useful

Do not call every completed set a hard set unless a real hard-set definition is introduced.

## _STRENGTH_MODEL -> Rolling e1RM

Corrected web definitions:

- CURRENT estimate: median of the last 4 qualifying exposures as of now
- BEFORE_SESSION estimate: median of the last 4 qualifying exposures strictly before the target session
- qualifying exposure must be dated and resolved
- an e1RM set requires a positive load, reps within 1-8, RPE within 7-10 and an exact grid entry
- migrated unresolved rows and undated rows do not enter chronology-dependent estimates

## _VARIATION_MODEL -> Learned ratios

Workbook concept to keep:

- variations can learn a relationship to their parent/reference lift
- ratio evidence must be paired
- insufficient evidence should not count a variation at full parent-lift weight

Corrected web rule:

- create real variation/reference pairs inside a configurable pairing window
- pair count means actual pairs
- learned ratio is a robust statistic of pair ratios, default median
- minimum pair count before dose contribution: 8

## _DOSE_MODEL -> Contribution tiers

Keep the tier model:

- T1: selected competition/reference lift, contribution weight 1.0
- T2: eligible variation with enough paired evidence, contribution weight = learned ratio
- T3: eligible variation with insufficient evidence, tracked separately, parent contribution 0
- T4: non-contributing exercise, parent contribution 0

Canonical field:

`weighted_relative_dose = relative_dose * contribution_weight`

Parent-lift analytics use weighted relative dose.

## _PREP_MODEL -> Prep selector

Workbook intent:

- session main lift
- user's selected focus areas
- active drills relevant to that lift
- use drill durations until time budget is filled

Web corrected algorithm:

1. resolve the session's primary parent lift from the first meaningful strength slot
2. candidates are active drills relevant to that lift or `All`
3. candidate target/secondary areas must match one of the user's chosen focus areas, unless no focus is selected
4. rank deterministically by relevance then library order / user priority
5. add drills while cumulative duration remains within the budget
6. save the selected prep against the exact session

## _CACHE -> Do not port

The spreadsheet cache exists because sheets need expensive formula indirection. The web app does not need a hidden alternative engine.

Use:

- database queries
- typed engine functions
- server-side derived services
- React query state where appropriate

Do not recreate `_CACHE` as a database table.
