# PowerCoach Web V1

## Product direction
PowerCoach is now an application, not a spreadsheet clone. The spreadsheet remains the historical-data source and rule-discovery prototype.

## Canonical identity
`Block -> Session -> Exercise Slot -> Planned Set -> Performed Set`

An exercise slot is a prescription instance. Two SSB Squat prescriptions in the same session remain distinct because their slot IDs differ.

## First vertical slice
1. Exercise library
2. Programme builder
3. Generate dated sessions
4. Today view
5. Log exact planned sets
6. History

The first slice deliberately precedes advanced analytics. Logging must be trustworthy before adaptive models are allowed to influence prescriptions.

## Core rules already encoded
- Rep/RPE/% ranges are structured data, never spreadsheet date-like tokens.
- RPE-only first exposures are valid without a starting load.
- Double Progression first exposures are valid without a starting load.
- Bodyweight movements may be unweighted or use external load.
- Variation references follow: direct -> learned ratio -> seed ratio -> selected reference lift -> no numerical reference.
- Blank variation ratio never means 1.00.
- Historical performed prescriptions are snapshotted and immutable.
- Chronology comes from explicit session dates.
- Current estimate and pre-session estimate are separate concepts.

## Engine services to complete
- Authoritative RPE chart / e1RM service imported from the existing PowerCoach workbook
- Session generation from training-day preferences
- Exact prescription resolver for `% e1RM`, `RPE`, `% + RPE`, fixed load and bodyweight states
- Logging transaction that freezes the planned prescription
- Rolling strength model
- True variation-pair model
- Weighted dose model
- Productive-dose response model
- Competition phase / block-fit warnings
- Prep selection engine

## Migration
The existing workbook should be treated as read-only source data. Migrated rows with no trustworthy date may be stored for history but excluded from chronology-dependent modelling.
