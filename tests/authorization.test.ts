import assert from "node:assert/strict";
import test from "node:test";

import { canManageAthlete, isSelfCoachedAthlete, type AuthorizationIdentity } from "../lib/auth/policy.ts";

const selfCoached: AuthorizationIdentity = {
  id: "user-a",
  role: "ATHLETE",
  coachProfile: null,
  athleteProfile: { id: "athlete-a", coachId: null },
};

const assignedCoach: AuthorizationIdentity = {
  id: "user-coach",
  role: "COACH",
  coachProfile: { id: "coach-a" },
  athleteProfile: null,
};

test("recognizes and authorizes a self-coached athlete for their own profile", () => {
  assert.equal(isSelfCoachedAthlete(selfCoached), true);
  assert.equal(canManageAthlete(selfCoached, { id: "athlete-a", userId: "user-a", coachId: null }), true);
});

test("authorizes only the assigned coach", () => {
  assert.equal(canManageAthlete(assignedCoach, { id: "athlete-a", userId: "user-a", coachId: "coach-a" }), true);
  assert.equal(canManageAthlete(assignedCoach, { id: "athlete-b", userId: "user-b", coachId: "coach-b" }), false);
});

test("denies cross-athlete access and unassigned coach access", () => {
  assert.equal(canManageAthlete(selfCoached, { id: "athlete-b", userId: "user-b", coachId: null }), false);
  assert.equal(canManageAthlete(assignedCoach, { id: "athlete-a", userId: "user-a", coachId: null }), false);
});
