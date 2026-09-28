# Exercise Library Seed Audit

The V7 workbook extraction contains 117 active exercise rows. The seed is deliberately preserved rather than silently "cleaned" from assumptions.

## Counts

| Field | Value | Count |
|---|---|---:|
| Main lift | Accessory | 77 |
| Main lift | Bench | 15 |
| Main lift | Squat | 14 |
| Main lift | Deadlift | 11 |
| Capability | LOADED_REPS | 83 |
| Capability | BODYWEIGHT_REPS | 21 |
| Capability | TIME | 11 |
| Capability | WEIGHTED_BODYWEIGHT | 2 |
| Default mode | Rep Target | 60 |
| Default mode | % e1RM | 30 |
| Default mode | Double Progression | 27 |
| Progression eligibility | Yes | 57 |
| Progression eligibility | No | 57 |
| Progression eligibility | Optional | 3 |

## Rows needing metadata review

The extracted workbook has five late-added exercises with blank Equipment and Movement Pattern values:

- Paused Conventional Deadlift
- Competition Bench (Back-Off)
- DB Preacher Curl
- Single-Leg Leg Press
- Dead Bug

Do not invent these values during seed import. Import the rows, mark/allow them for review, and let the athlete correct them in the Exercise Library UI.

## Known semantic review examples

Some older metadata may be technically populated but still not match the athlete's preferred use, for example a movement marked TIME that may sometimes be prescribed for reps. The library must therefore remain editable.

## Import rule

Application validation can require fields such as Equipment for *new* exercises while still allowing legacy seed rows with missing metadata to exist until reviewed.

Run:

```bash
npm run validate:seeds
```

to verify the extracted counts and duplicate-name integrity.
