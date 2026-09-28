# Exercise Library Specification

## Goal

The Exercise Library is a real editable database, not a hard-coded seed list.

PowerCoach ships with the 117 exercises extracted from the V7 workbook, but the athlete must be able to add, edit, duplicate and archive exercises at any time.

The programme builder reads live active exercises from this library.

## Seed data

Files:

- `data/powercoach/seed/exercises.json`
- `data/powercoach/seed/exercises.csv`

The seed is an exact extraction of the workbook's useful exercise fields. Some legacy metadata is questionable and should be reviewable in the UI rather than silently "corrected" during import.

Current seed summary:

- 117 active exercises
- 14 squat-family
- 15 bench-family
- 11 deadlift-family
- 77 accessory / non-parent exercises
- 83 LOADED_REPS
- 21 BODYWEIGHT_REPS
- 2 WEIGHTED_BODYWEIGHT
- 11 TIME

## Canonical fields

### Required

- `name`
- `main_lift`: Squat / Bench / Deadlift / Accessory
- `category`
- `movement_pattern`
- `equipment` (required for newly created exercises; legacy seed rows may be blank and flagged for review)
- `capability`
- `default_mode`
- `active`

### Optional / contextual

- `legacy_id`
- `parent_lift`: Squat / Bench / Deadlift / null
- `progression_group`
- `progression_eligibility`: YES / NO / OPTIONAL
- `load_step_kg`
- `tier`: 1 / 2 / 3
- `rest_text`
- `seed_ratio`
- `notes`
- `source`: SEEDED / CUSTOM / IMPORTED

## Add exercise flow

The user can add an exercise from:

1. Exercise Library page
2. Programme exercise picker via `+ Add new exercise`

### Add drawer / modal

Primary fields shown first:

- Exercise name
- Main lift / family
- Category
- Equipment
- Capability
- Default progression mode

Advanced fields collapsed by default:

- Parent lift
- Movement pattern
- Progression group
- Progression eligibility
- Load step
- Tier
- Rest guidance
- Seed variation ratio
- Notes

Buttons:

- Cancel
- Save exercise

After save from Programme, the new exercise is automatically selected in that exercise slot.

## Edit behaviour

Editable from the exercise detail/drawer.

Changes apply to future programme resolution. They do not rewrite historical performed-set snapshots.

If the exercise is already used in an active block, show a small warning when editing fields that materially affect future prescriptions:

- capability
- load step
- parent lift
- seed ratio
- progression group / eligibility

Do not prevent editing unless there is a structural integrity problem.

## Archive behaviour

Use Archive, not Delete, when an exercise has history.

Archived exercises:

- remain visible in historical sessions
- remain resolvable by ID
- disappear from default programme search
- can be restored

Hard delete is permitted only for a newly created unused exercise, if desired.

## Duplicate behaviour

`Duplicate` creates a new custom exercise with copied metadata and prompts for a new name.

Useful for quick variants such as:

- 2ct Paused Bench
- 3ct Paused Bench
- High Bar + Belt

## Search / filters

Search by:

- exercise name
- movement pattern
- progression group
- equipment

Filters:

- Main lift
- Category
- Equipment
- Capability
- Active / Archived
- Progression eligible

Sort:

- Name
- Main lift
- Category
- Recently used
- Recently added

## Bodyweight rule

Do not force separate exercise records merely because one session adds weight.

Example:

`Pull-Up` may default to `BODYWEIGHT_REPS`.

In a particular programme slot the athlete can choose:

- Bodyweight execution
- Weighted bodyweight execution

The slot capability overrides the library default.

Legacy `Weighted Pull-Up` and `Weighted Dip` seed rows may remain for migration fidelity, but the app architecture must not require duplicate names to support added load.

## Reference-lift eligibility

Settings should allow the athlete to select the active Squat, Bench and Deadlift reference exercises from the library.

Recommended candidates are exercises whose:

- parent/main family matches the lift
- progression group marks them as a main lift, OR the athlete deliberately chooses them

Do not infer the active reference from whichever row happens to be last.

## Variation seed ratio

`seed_ratio` is optional.

Blank means unknown, never 1.0.

If populated, it is used only when:

1. there is no direct exercise estimate
2. there is no learned variation ratio
3. the selected parent reference has a valid current e1RM

## Capability guidance

### LOADED_REPS

Normal external load + repetitions.

### BODYWEIGHT_REPS

Bodyweight-centred movement. External added load may still be entered if the slot uses it.

### WEIGHTED_BODYWEIGHT

A prescription where added external load is explicitly part of the target.

### TIME

Duration-led movement.

### AMRAP legacy

Prefer modelling AMRAP as a rep scheme in new programmes. Retain import compatibility for legacy rows.

## Metadata review

The legacy library contains some metadata that may not reflect how the athlete currently wants to use an exercise, for example movements tagged TIME that may be prescribed for reps, or bodyweight mobility movements carrying an irrelevant load step.

Do not automatically rewrite these rows from assumptions.

Recommended UI:

- imported exercises retain their data
- athlete can correct them normally
- optional `Needs review` filter can be added later

## Acceptance criteria

- athlete can add an exercise without touching code or database admin
- new exercise appears immediately in Programme search
- duplicate normalised names are rejected with a useful message
- names are trimmed before save
- exercise can be edited
- referenced exercise can be archived but history remains intact
- archived exercise can be restored
- inline add from Programme returns to the slot with the new exercise selected
- library change never mutates historical performed-set snapshots
