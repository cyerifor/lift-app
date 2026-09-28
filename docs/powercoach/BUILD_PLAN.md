# PowerCoach build plan

## Phase 1: trustworthy training loop
Goal: use PowerCoach in the gym without relying on spreadsheet formula state.

- Supabase auth and database
- Exercise library CRUD
- Reference-lift selection
- Block and dated session generation
- Programme builder with structured rep/RPE/% fields
- Exact ExerciseSlot and PlannedSet identities
- Today query for one SessionID
- Set logging transaction with frozen prescription snapshot
- Previous-exposure display
- Session completion and current-block adherence

Exit condition: a complete block can be programmed and sessions can be logged without ambiguous IDs or data loss.

## Phase 2: coaching engine
- RPE/e1RM service using the exact V7 RPE grid
- rolling current e1RM and pre-session e1RM
- reference-strength hierarchy
- RPE load suggestions
- % e1RM and % + RPE intersection
- Double Progression INCREASE/HOLD/REDUCE
- weekly mode-aware progression
- deload rules
- future-session resolution without future leakage

## Phase 3: learning models
- true variation pairing
- learned variation ratios
- T1/T2/T3/T4 dose contribution
- weighted relative dose
- intensity distribution
- response / productive-dose modelling

## Phase 4: competition and prep
- competition planner
- peak/taper phase logic
- block-fit warnings
- prep focus and drill selector
- readiness behaviour

## Phase 5: product polish
- installable PWA
- responsive mobile interactions
- charts and progress dashboard
- import historical workbook data
- export/backup
- destructive QA and beta use

## Deliberate non-goals for the first slice
- React Native
- multi-coach/team accounts
- payment/subscription
- social features
- copying spreadsheet UI one-for-one
