# PowerCoach UI / UX Specification

## Product principles

### 1. Built for the gym first

The primary live-use surface is TODAY on a phone. Controls must be large, fast and readable between sets.

### 2. Guided, not restrictive

PowerCoach should offer sensible structured choices without forcing the user to memorise engine terminology. Advanced fields exist but stay out of the way until needed.

### 3. No engine error codes in the UI

Never show strings like:

- STARTING_LOAD_REQUIRED
- MANUAL_LOAD_REQUIRED
- #DIV/0!

Show useful human states:

- First exposure: choose a load that reaches RPE 8.
- No numerical reference yet.
- Not enough paired history to learn this variation yet.
- Percentage and RPE targets do not overlap.

### 4. Explain every suggestion

Every numerical suggestion has a `Why` disclosure.

Examples:

- `212.5 kg · direct SSB estimate from 4 exposures`
- `180 kg · learned SSB:Squat ratio 0.84 from 9 pairs`
- `Choose load · first RPE exposure`

### 5. Preserve athlete control

The engine suggests. The user can intentionally override loads in the gym. The app records what actually happened.

### 6. Historical truth is immutable

Editing an exercise, block or setting later cannot silently rewrite what was prescribed/performed in the past.

## Navigation

### Mobile bottom navigation

- Home
- Plan
- Programme
- Today
- Progress

Settings/avatar menu contains:

- Setup
- Exercise Library
- Drill Library
- History
- Tools
- About / How PowerCoach works

TODAY should receive the strongest visual emphasis.

### Desktop

Persistent left sidebar with all primary routes plus Libraries / Settings beneath a divider.

## Visual language

Keep the workbook's strong PowerCoach character but make it application-native.

Suggested palette:

- Ink / navigation: `#111827`
- Brand navy: `#0F172A`
- Action blue: `#2563EB`
- Page background: `#F4F6F8`
- Surface: `#FFFFFF`
- Muted text: `#64748B`
- Border: `#E2E8F0`
- Success: `#15803D`
- Warning: `#B45309`
- Error: `#B91C1C`

Typography:

- Inter / system sans
- bold condensed-feeling headings through weight/tracking rather than a novelty font
- tabular numerals for loads/reps/RPE where possible

## HOME

Primary job: answer four questions quickly.

1. What block/week am I in?
2. What is my next session?
3. Where is my strength now?
4. Does anything need attention?

Sections:

- active block hero
- Next Session CTA
- Squat / Bench / Deadlift current e1RM cards
- this week: completed sessions / planned sessions, adherence
- current parent-lift dose summary
- alerts / attention
- small recent progress snapshot

Do not overload Home with deep analytics.

## SETUP / SETTINGS

Use sections/cards rather than one long form.

### Athlete

- Name
- Units
- Bodyweight
- Default load increment

### Reference strength

For Squat / Bench / Deadlift:

- selected reference exercise
- recent representative load
- reps
- RPE
- calculated seed e1RM shown live

### Training schedule

- sessions per week
- ordered training days

### Session check-in

- readiness tracking toggle

### Prep

- focus areas 1-3
- prep time budget

Save automatically or via one persistent Save bar. Do not scatter separate save buttons per field.

## PLAN

Competition cards/table.

Add competition fields:

- Name
- Date
- Weight class
- Priority 1 High / 2 Medium / 3 Low
- Peak weeks
- Taper weeks
- Status
- Notes

Each card shows:

- weeks out
- BASE / PEAK / TAPER state
- linked active/upcoming block if any

No Federation field in V1.

## PROGRAMME

### Block builder header

- Block name
- Competition optional
- Phase
- Start date
- Weeks
- Sessions/week
- Deload
- Intensity trend
- Volume trend
- Apply progression

Immediately show generated date preview / fit warning.

### Session editor

Use one card per session template.

Header:

- S1 / S2 etc
- planned weekday
- optional session name
- drag handle / reorder if supported

Inside session:

Each prescription is an Exercise Slot card/row.

Primary compact view:

- Exercise
- Set type
- Sets x reps
- Mode
- percentage / RPE target as relevant
- resolved suggested load / state

Actions:

- drag reorder
- duplicate slot
- remove slot
- advanced settings

`+ Add exercise` opens searchable Exercise Library. Search results include an inline `+ Create exercise` action.

### Structured prescription controls

Do not make the user type `8-12` unless they deliberately use quick text entry.

Recommended controls:

- Sets: number stepper
- Reps: fixed / range / AMRAP segmented control
- Mode: select
- RPE: target / range / cap
- Percentage: target / range
- Fixed Load: numeric field

The UI hides irrelevant fields based on mode.

### Generate / preview

Before activating the block:

- show Week 1 template
- preview generated weeks
- highlight changes caused by progression/deload
- show competition fit warnings

Do not silently activate a malformed block.

## TODAY

TODAY is a session runner, not an editor for the programme.

### Top

- date
- session name
- week / block
- session switcher
- progress e.g. `4 / 7 exercises`

### Check-in

Collapsed compact row:

- BW
- Sleep
- Ready

If readiness is disabled, Sleep/Ready are absent.

### Prep

Collapsible card showing:

- focus areas
- selected drills
- total minutes
- cues on tap

### Exercise card

Header:

- exercise name
- set type badge
- status

Prescription:

- `2 x 4 @ RPE 7.5-8`
- suggested load large if available
- `Why` text directly below
- `Last time` compact historical line

Set table:

- set number
- Load / Added Load as applicable
- Reps or Seconds
- RPE
- completion tick

Bodyweight behaviour:

- unweighted slot can leave added load blank
- weighted slot labels the field `Added load`

Save behaviour:

- optimistic autosave per completed set
- explicit saved indicator
- edit remains possible
- undo/unperform is deliberate, not a stray tap

After last planned set, show session completion summary and `Finish session`.

## PROGRESS

Progress is analytical, not a dumping ground.

Tabs/sections:

1. Strength
2. Training dose
3. Variations
4. Blocks

### Strength

- current reference-lift e1RMs
- time-series chart
- exercise selector for variation-specific history
- exposure count

### Training dose

- planned vs performed for active block
- parent lift dose over time
- intensity distribution
- productive-dose section only when there is enough valid response data

### Variations

Table/cards:

- variation
- parent/reference exercise
- learned ratio
- true pair count
- confidence
- T1/T2/T3/T4 treatment

### Blocks

Compare completed blocks using equivalent metrics:

- phase
- weeks
- sessions
- completed sets
- tonnage
- avg RPE
- start/end reference-lift e1RM change

No composite score.

## EXERCISE LIBRARY

See `EXERCISE_LIBRARY_SPEC.md`.

Primary page:

- Search
- Filter chips
- Add exercise button
- list/table responsive to screen
- tap row to edit
- archive/restoration views

## HISTORY

Two useful views:

### Sessions

Chronological training sessions with completion state and summary.

### Exercise history

Search an exercise and show exposures/sets over time.

This is where migrated undated history may still be visible even if excluded from chronological modelling.

## TOOLS

- e1RM calculator
- warm-up calculator

Utilities should use the same engine functions as the rest of the app.

## Empty states

Examples:

No block:
`No active block yet. Build your first programme.`

No strength data:
`No current estimate yet. Complete a qualifying exposure or add starting strength.`

No variation evidence:
`Not enough paired history yet. PowerCoach will learn this relationship as you train both lifts.`

No next session:
`Nothing scheduled.`

## Error and warning hierarchy

### Blocking errors

Only when data would be invalid or impossible:

- duplicate exercise name
- percentage mode with no reference and no way to resolve
- invalid range min > max
- block cannot generate because sessions/weeks are missing

### Warnings

Allow explicit override where safe:

- block extends beyond competition
- unusual seed ratio
- editing metadata used by an active block

### Informational states

Never blockers:

- first RPE exposure has no suggested load
- first DP exposure has no suggested load
- variation has insufficient pairs
