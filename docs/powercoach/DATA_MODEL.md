# PowerCoach Web Data Model

## Canonical identity

```text
User
  -> Block
      -> Session
          -> ExerciseSlot
              -> PlannedSet
                  -> PerformedSet
```

`ExerciseSlot` is essential. It is why these remain different:

- SSB Squat, Top Set, 1 x 4 @ 7.5-8
- SSB Squat, Back-off, 1 x 8 @ 6.5-7

The exercise is the same. The prescription instance is not.

## Tables / domains

### profiles

User preferences and reference selections.

Key fields:

- id
- display_name
- display_units
- bodyweight_kg
- default_load_step_kg
- readiness_enabled
- sessions_per_week
- training_days
- prep_focus_areas
- prep_budget_minutes
- squat_reference_exercise_id
- bench_reference_exercise_id
- deadlift_reference_exercise_id

### starting_strengths

One seed record per parent lift.

- user_id
- parent_lift
- load_kg
- reps
- rpe
- calculated_e1rm_kg
- updated_at

### exercises

Full editable library. See `EXERCISE_LIBRARY_SPEC.md`.

### drills

Editable prep library.

### competitions

- user_id
- name
- competition_date
- weight_class
- priority 1-3
- peak_weeks
- taper_weeks
- status
- notes

### blocks

- user_id
- competition_id nullable
- name
- phase
- start_date
- weeks
- sessions_per_week
- deload
- intensity_trend
- volume_trend
- apply_progression
- status
- frozen_at

Only one active block per athlete in V1.

### sessions

Chronology authority.

- block_id
- week
- session_code
- planned_date
- training_day
- name
- status

Unique `(block_id, week, session_code)`.

### exercise_slots

One prescription instance.

- session_id
- order_in_session
- exercise_id
- set_type
- mode
- capability
- set_count
- rep_scheme
- rep_min
- rep_max
- rpe_min
- rpe_max
- rpe_cap
- pct_min
- pct_max
- fixed_load_kg
- reference_e1rm_kg
- reference_source
- variation_ratio_used
- suggested_load_min_kg
- suggested_load_max_kg
- suggested_load_kg
- load_reason
- notes

Unique `(session_id, order_in_session)`.

### planned_sets

- exercise_slot_id
- set_number
- status

Unique `(exercise_slot_id, set_number)`.

### performed_sets

Actual training + immutable snapshot.

Use `planned_set_id` unique where it exists so one planned set cannot accidentally produce two live performed rows.

Migrated/ad-hoc history may have no planned set.

### checkins

One per session:

- bodyweight_kg
- sleep 1-10, decimal allowed
- readiness 1-10, decimal allowed

### exposures

Derived one exercise/session analytical row.

### strength_estimates

- exercise_id
- as_of
- estimate_kind CURRENT / BEFORE_SESSION
- e1rm_kg
- exposure_count
- source

### variation_pairs

One real historical pair.

### variation_models

Current learned relationship per variation/reference exercise pair.

### dose_observations

Per-exposure dose features and response fields.

### session_prep

Persisted drill selection for a session.

## Snapshot rule

The exercise library is mutable. History is not.

Changing:

- an exercise's default mode
- its seed ratio
- load step
- progression group
- reference lift selection

may affect future resolution, but it must not alter the snapshot attached to completed performed sets.

## Deletion rule

If an exercise/drill is referenced by programme or history, do not hard delete it. Archive it (`active=false`). It disappears from normal selectors but remains resolvable historically.

## Units

Store canonical load values in kg in the database.

Convert to/from lb at UI boundaries.

Do not store mixed-unit historical values without an explicit unit field and conversion step.
