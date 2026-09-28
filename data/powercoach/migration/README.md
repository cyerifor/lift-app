# PowerCoach workbook migration data

This directory contains extracted legacy PowerCoach V7 data used only for controlled migration into the web app.

## Training history

The 325 historical training-log rows are split across the files listed in `training-log.manifest.json` to keep the repository handoff manageable.

Import rules are defined in `docs/powercoach/MIGRATION_SPEC.md`.

Important:
- do not infer missing dates
- do not use unresolved rows in load-dependent models
- preserve source/provenance fields
- do not treat migrated rows lacking a trustworthy mode snapshot as Double Progression history

## Shared seed data

Exercise, drill and RPE reference data are stored once under `data/powercoach/seed/` rather than duplicated here. `system.json` contains extracted V7 engine/configuration keys and thresholds.
