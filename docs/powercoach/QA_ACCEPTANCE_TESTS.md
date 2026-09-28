# PowerCoach Web Acceptance Tests

These tests are the product contract. Codex should add automated tests as each vertical slice is implemented.

## Identity / data integrity

1. Same exercise twice in one session creates distinct ExerciseSlot IDs.
2. SSB Squat Top Set and SSB Squat Back-off never share a PlannedSet ID.
3. Completing one planned set cannot update another set with the same exercise name/set number in another week.
4. A completed performed-set snapshot does not change after programme/library edits.
5. Archived exercises remain resolvable in historical sessions.

## Structured prescriptions

6. `8-12` import parses to repMin 8 / repMax 12 and can never become a date serial.
7. `7.5-8` parses correctly.
8. `<=8` produces an RPE cap.
9. `70-75%` parses to 0.70 / 0.75.
10. min > max is rejected with human-readable validation.

## Exercise Library

11. User can create a new exercise from Library.
12. User can create a new exercise inline from Programme and it is immediately selected.
13. Leading/trailing whitespace is trimmed.
14. Duplicate normalised names are rejected.
15. User can edit exercise metadata.
16. Used exercise can be archived and restored.
17. Library edit does not rewrite completed historical snapshots.

## Starting strength / RPE grid

18. 257.5 x 1 @9 calculates approximately 271.0526 kg e1RM.
19. 185 x 1 @9.5 calculates approximately 190.7216 kg e1RM.
20. No e1RM is invented for unsupported RPE/reps outside the authoritative grid.

## Reference hierarchy

21. Direct exercise estimate beats learned variation ratio.
22. Learned variation ratio beats seed ratio.
23. Seed ratio beats no reference.
24. Blank ratio never means 1.0.
25. Selected reference exercise can use parent reference e1RM.
26. Non-reference variation with no direct/learned/seed data returns no numerical reference.

## RPE prescriptions

27. First RPE exposure with no reference is VALID.
28. First RPE exposure has no forced numerical load.
29. UI explains that user should choose load to reach target RPE.
30. When valid reference + supported reps/RPE exist, load band is calculated and rounded.

## Double Progression

31. First exposure is VALID without starting load.
32. All sets at rep max and within recorded RPE cap => INCREASE.
33. Inside range but not all top reps => HOLD.
34. One failed exposure => HOLD.
35. Two consecutive failed exposures => REDUCE.
36. Missing RPE when a cap is required cannot earn INCREASE.

## Bodyweight

37. Pull-Up 3 x 8 @8 with no added load works.
38. Same Pull-Up exercise can be programmed as weighted in another slot.
39. Weighted Pull-Up +20 kg stores +20 kg external load and reps/RPE.
40. Bodyweight movement with null/zero load step never divides by zero.

## Time

41. TIME prescription stores seconds.
42. TIME does not run e1RM maths.
43. TODAY labels the input as Seconds.

## Programme generation

44. Configured training days generate unique dated sessions.
45. Session chronology does not rely on row order.
46. Percentage Linear Up adds 2.5 percentage points per week step.
47. Percentage Linear Down subtracts 2.5 points.
48. Volume Linear Up applies 1.1^(week-1), rounded to sets.
49. Volume Linear Down applies 0.9^(week-1).
50. RPE Linear Up applies +0.5 per week step.
51. Double Progression is not artificially progressed by the weekly trend engine.
52. Volume deload changes volume only.
53. Intensity deload changes intensity only.
54. Both changes both.
55. Performed historical prescriptions are never regenerated/rewritten.

## Competition planning

56. Peak 3 / Taper 2 => weeks 1-2 TAPER, weeks 3-5 PEAK, >5 BASE.
57. A block longer than available time to a linked competition produces a warning.
58. Competition priority is 1-3, not A+/A/A-.
59. Federation is not required by V1.

## TODAY

60. Next session defaults to the exact next Session ID.
61. Current session is excluded from Last Time.
62. Every session can render dynamically regardless of exercise count.
63. Every exercise slot can render all planned sets.
64. Save confirmation is visible.
65. Unperform/edit is deliberate and recalculates derived state.
66. Readiness fields disappear when readiness tracking is disabled.
67. Prep shown belongs to the exact session.

## Strength model

68. Exposure e1RM is median of qualifying set e1RMs in that exercise/session.
69. CURRENT estimate includes newest valid exposure.
70. BEFORE_SESSION excludes target session and future exposures.
71. Rolling window uses last four qualifying exposures.
72. Undated migrated exposure is excluded from chronology-dependent estimate.
73. Unresolved migration row is excluded from load-dependent model.

## Variation model

74. Pair count equals actual pairs, not exposure count.
75. Learned ratio uses actual pair ratios.
76. Variation with <8 pairs is T3 if eligible.
77. Variation with >=8 pairs becomes T2 if eligible.
78. Non-eligible variation is T4.
79. Selected reference lift is T1.

## Dose

80. T1 contribution weight = 1.
81. T2 weight = learned ratio.
82. T3/T4 weighted parent dose = 0.
83. Parent dose analytics use weighted relative dose, not simple parent labels.
84. Productive dose displays insufficient data until a real response model has enough evidence.

## Dashboard / Progress

85. Home adherence is scoped to active block only.
86. Home current week derives from active block/session chronology, not a TODAY selector.
87. Next-session exercise list belongs to the same exact Session ID.
88. Intensity distribution allocates reps to correct band.
89. Sets without valid reference are excluded from intensity distribution.
90. Block comparison compares real equivalent metrics and shows no composite score.
