# M1B Exercise Library backend

## Ownership and physical tables

Every library `Exercise` belongs to exactly one `Athlete`. An athlete can manage
their own library, including when self-coached. A coach can manage only an
athlete currently assigned to that coach. The API treats an `athleteId` as a
resource selector, never as proof of identity; Better Auth resolves the acting
user and the server checks the athlete relationship.

The Prisma `Exercise` model maps to the existing physical `ExerciseTemplate`
table. The Prisma `ExerciseSlot` model maps to the existing physical `Exercise`
table, and its canonical `exerciseId` maps to the legacy
`exerciseTemplateId` column. This preserves physical tables, slot IDs, library
IDs, and existing foreign-key references without confusing the two concepts.

## Names and archive behavior

Names are normalized with Unicode NFKC, trimming, internal-whitespace collapse,
and lowercase conversion. PostgreSQL enforces unique `(athleteId,
normalizedName)` values. Archived records reserve their normalized name: users
must restore or rename the archived record rather than create an ambiguous
second active exercise. Archive and restore retain the same stable ID.

## Seed behavior

The loader reads the checked-in manifest and its exact four part files and
rejects anything other than 117 unique normalized names. It maps source values
to canonical enums without inventing missing metadata. The five documented
legacy rows retain null movement/equipment metadata. `createMany` with database
uniqueness makes per-athlete seeding idempotent, and athlete invite acceptance
seeds within the same profile transaction.

## API

- `GET|POST /api/exercises`
- `GET|PATCH /api/exercises/:exerciseId`
- `POST /api/exercises/:exerciseId/duplicate`
- `POST /api/exercises/:exerciseId/archive`
- `POST /api/exercises/:exerciseId/restore`

Coaches select the managed resource with `?athleteId=...`; athletes do not need
to supply it. Listing seeds an empty/incomplete canonical library safely and
supports real search/filter/sort fields. No fake recently-used ordering exists.
There is no hard-delete endpoint in V1.
