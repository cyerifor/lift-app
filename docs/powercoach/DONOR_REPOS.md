# Approved Donor / Reference Repositories

PowerCoach is built on `cyerifor/lift-app`. The repositories below are approved donor/reference sources. They are **not** the canonical architecture and must not be forked wholesale into the product.

For each donor, verify its current licence before directly copying code and preserve any required notices/attribution.

## 1. aptx-health/ripit-fitness

Use primarily for:
- strength programme-builder UX
- programme/session interaction patterns
- mobile training workflows
- reusable strength-app UI patterns
- useful auth/database patterns where compatible

Do not replace PowerCoach's canonical identity model or coaching engine with Rippit's model.

## 2. pr103183/Workout_Tracker_V2

Use primarily for:
- Dexie / IndexedDB patterns
- offline-first workout logging
- immediate local writes in gym mode
- background synchronisation
- network recovery / resync behaviour
- PWA workout-session recovery

PowerCoach TODAY should eventually remain usable during poor/no gym connectivity without losing performed sets.

## 3. apnatvar/open-workout (Forme)

Use primarily for:
- master exercise catalogue ideas
- exercise search/filter UX
- exercise discovery and metadata
- workout-builder interaction patterns

PowerCoach's extracted user library remains the user's editable library. A larger catalogue can be offered as an import/discovery source. Do not copy media assets unless their rights explicitly permit the intended use.

## 4. shadcn-ui/ui

Preferred source for generic UI primitives where appropriate:
- command / searchable picker
- popover
- sheet / mobile drawer
- dialog / alert dialog
- tabs
- form controls
- dropdown menus
- date/calendar controls
- switches
- toast/feedback

Before hand-building a generic UI primitive, check whether an appropriate shadcn component exists.

## 5. Lucide

Preferred application icon library. Avoid creating a bespoke icon system unnecessarily.

## 6. Apache ECharts

Preferred candidate for PowerCoach PROGRESS visualisations, including:
- rolling e1RM
- intensity distribution
- dose / volume
- block comparison
- exposure/frequency trends

The PowerCoach engine supplies the numbers. Charting code must not become a second analytics engine.

## 7. Storybook

Use once reusable UI components justify it, particularly for isolated development/testing of:
- ExerciseCard
- SetEntryRow
- PrescriptionBadge
- RPE selector
- ExercisePicker
- progress/analytics cards

## Donor-repo rule

For every donor repo considered during implementation, document:
1. exact component/pattern proposed for reuse
2. direct adaptation vs inspiration only
3. dependency implications
4. licence/attribution obligations
5. conflicts with the existing Lift App
6. conflicts with the PowerCoach specification

Prefer mature generic infrastructure over rebuilding it, but never replace unique PowerCoach domain logic merely because a donor already has simpler lifting logic.
