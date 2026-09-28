# PowerCoach Low-Fidelity Wireframes

These are implementation wireframes, not final visual designs. Codex should use them to establish information hierarchy and mobile behaviour before polishing styles.

## Mobile: Home

```text
┌──────────────────────────────────┐
│ POWERCOACH                  [CY] │
├──────────────────────────────────┤
│ CURRENT BLOCK                    │
│ Hypertrophy · Week 2 of 5        │
│ 11 weeks out                     │
├──────────────────────────────────┤
│ NEXT SESSION                     │
│ S3 · Fri 2 Oct                   │
│ SSB Squat · Trap Bar · ...       │
│                    [OPEN TODAY]  │
├──────────────────────────────────┤
│ CURRENT STRENGTH                 │
│ Squat        Bench      Deadlift │
│ 271 kg       191 kg     261 kg   │
│ +1.2%        +0.4%      —        │
├──────────────────────────────────┤
│ THIS WEEK                        │
│ Sessions  2 / 4     Adherence 50%│
│ Squat dose   Bench dose   DL dose│
├──────────────────────────────────┤
│ NEEDS ATTENTION                  │
│ • No current DL exposure         │
│ • SSB ratio: 5 / 8 pairs         │
└──────────────────────────────────┘
  Home   Plan   Programme  TODAY  Progress
```

## Mobile: Programme Builder

```text
┌──────────────────────────────────┐
│ PROGRAMME                        │
│ [Hypertrophy 1]                  │
│ Competition [All Englands ▾]     │
│ Phase [Hypertrophy ▾]            │
│ Start [05 Oct]  Weeks [5]        │
│ Sessions/wk [4]                  │
│                                  │
│ Intensity [Linear Up ▾]          │
│ Volume    [Linear Down ▾]        │
│ Deload    [None ▾]               │
│                                  │
│ ⚠ Fits: block ends 10 wks out    │
├──────────────────────────────────┤
│ S3 · Friday                      │
│                                  │
│ ≡ SSB Squat                      │
│   Top Set                        │
│   [1] x [4]   Mode [RPE ▾]       │
│   RPE [7.5] – [8]                │
│   Suggested 212.5 kg             │
│   Why: direct estimate           │
│                          [•••]   │
│                                  │
│ ≡ SSB Squat                      │
│   Back-off                       │
│   [1] x [8]   Mode [RPE ▾]       │
│   RPE [6.5] – [7]                │
│   Suggested 180 kg               │
│                          [•••]   │
│                                  │
│ [+ ADD EXERCISE]                 │
├──────────────────────────────────┤
│ [PREVIEW 5 WEEKS] [SAVE DRAFT]   │
└──────────────────────────────────┘
```

## Mobile: Add exercise from Programme

```text
┌──────────────────────────────────┐
│ ADD EXERCISE                 [×] │
├──────────────────────────────────┤
│ [ Search exercises...          ] │
│ [Squat] [Bench] [DL] [Accessory] │
│                                  │
│ SSB Squat                        │
│ Squat · Barbell                  │
│                                  │
│ Trap Bar Deadlift                │
│ Deadlift · Barbell               │
│                                  │
│ DB Incline Press                 │
│ Accessory · Dumbbell             │
│                                  │
│ + CREATE NEW EXERCISE            │
└──────────────────────────────────┘
```

## Mobile: Create exercise

```text
┌──────────────────────────────────┐
│ NEW EXERCISE                 [×] │
├──────────────────────────────────┤
│ Name*                            │
│ [ Cable Y-Raise                ] │
│                                  │
│ Main lift*       Category*       │
│ [Accessory ▾]    [Strength... ▾] │
│                                  │
│ Equipment*       Capability*     │
│ [Cable ▾]        [Loaded reps ▾] │
│                                  │
│ Default mode*                    │
│ [Double Progression ▾]           │
│                                  │
│ ▸ Advanced                       │
│                                  │
│          [CANCEL] [SAVE EXERCISE]│
└──────────────────────────────────┘
```

## Mobile: Today

```text
┌──────────────────────────────────┐
│ TODAY                            │
│ S3 · Week 1 · Fri 2 Oct          │
│ Hypertrophy              2 / 7   │
├──────────────────────────────────┤
│ Check-in  BW [114] Sleep [8]     │
│           Ready [8]              │
├──────────────────────────────────┤
│ PREP · Hip, Brace/Core · ~7 min  │
│ [View 5 drills]                  │
├──────────────────────────────────┤
│ SSB SQUAT              TOP SET   │
│ Target: 1 x 4 @ RPE 7.5-8        │
│                                  │
│          212.5 kg                │
│ Why: direct SSB estimate         │
│ Last: 207.5 x 4 @ 7.5            │
│                                  │
│ Set   Load     Reps     RPE       │
│  1   [212.5]   [4]     [8]   [✓] │
├──────────────────────────────────┤
│ SSB SQUAT             BACK-OFF   │
│ Target: 1 x 8 @ RPE 6.5-7        │
│                                  │
│           180 kg                 │
│ Why: RPE band from direct e1RM   │
│ Last: 177.5 x 8 @ 7              │
│                                  │
│  1   [180]     [8]     [7]   [✓] │
├──────────────────────────────────┤
│ LAT PULLDOWN      HYPERTROPHY ACC│
│ Target: 2 x 8-12 @ RPE 8         │
│                                  │
│ Choose load                      │
│ First exposure: hit RPE 8        │
│                                  │
│  1   [  ]     [  ]     [ ]   [ ] │
│  2   [  ]     [  ]     [ ]   [ ] │
└──────────────────────────────────┘
```

## Mobile: Weighted / unweighted Pull-Up

```text
Unweighted slot
┌──────────────────────────────┐
│ PULL-UP · Strength Accessory │
│ 3 x 8 @ RPE 8               │
│ Set   Added load  Reps  RPE  │
│  1      [ — ]      [8]  [8]  │
└──────────────────────────────┘

Weighted slot
┌──────────────────────────────┐
│ PULL-UP · Strength Accessory │
│ 3 x 5 @ RPE 8               │
│ Set   Added load  Reps  RPE  │
│  1     [+20]       [5]  [8]  │
└──────────────────────────────┘
```

## Mobile: Plan

```text
┌──────────────────────────────────┐
│ PLAN                    [+ ADD]  │
├──────────────────────────────────┤
│ ALL ENGLANDS                     │
│ 18 Apr 2027 · U120               │
│ Priority: 1 High                 │
│ 29 weeks out                     │
│ BASE                             │
│ Peak 3 wks · Taper 2 wks         │
│ [EDIT]                           │
├──────────────────────────────────┤
│ BRITISH BENCH                    │
│ Feb 2027                         │
│ Priority: 2 Medium               │
│ ...                              │
└──────────────────────────────────┘
```

## Mobile: Progress

```text
┌──────────────────────────────────┐
│ PROGRESS                         │
│ [Strength][Dose][Variations][Blk]│
├──────────────────────────────────┤
│ CURRENT                          │
│ SQ 271     BP 191      DL 261    │
├──────────────────────────────────┤
│ STRENGTH DEVELOPMENT             │
│                                  │
│        [line chart]              │
│                                  │
├──────────────────────────────────┤
│ Exposure window                  │
│ Squat 4/4 · Bench 4/4 · DL 2/4  │
└──────────────────────────────────┘
```

## Desktop: Programme

```text
┌────────────┬─────────────────────────────────────────────────────────────┐
│ POWERCOACH │ Programme                                                   │
│            │ Hypertrophy 1 · 5 weeks · 4 sessions/week                  │
│ Home       │ ┌─────────────────────────────────────────────────────────┐ │
│ Plan       │ │ Block settings / competition fit / generate controls   │ │
│ Programme  │ └─────────────────────────────────────────────────────────┘ │
│ Today      │                                                             │
│ Progress   │ S1 Monday                                                   │
│            │ ┌──────────────┬────────┬──────┬──────┬──────┬──────────┐ │
│ Library    │ │ Exercise     │ Type   │ Sets │ Reps │ Mode │ Target   │ │
│ History    │ │ Bench        │ Top    │ 1    │ 3    │ RPE  │ 8        │ │
│ Settings   │ │ Bench        │ Backoff│ 3    │ 5    │ RPE  │ 7        │ │
│            │ └──────────────┴────────┴──────┴──────┴──────┴──────────┘ │
│            │ [+ Add exercise]                                            │
│            │                                                             │
│            │ S2 Tuesday ...                                              │
└────────────┴─────────────────────────────────────────────────────────────┘
```

## Interaction rules

- Mobile forms use drawers/sheets for secondary editing rather than navigating away unnecessarily.
- Programme supports drag reorder, but order is persisted numerically and does not define identity by itself.
- Important actions have text labels, not icon-only mystery controls.
- Destructive actions require confirmation.
- Save state is visible.
- Empty engine states explain what will create data.
