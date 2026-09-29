import assert from "node:assert/strict";
import test from "node:test";

import { getLoginDestination } from "../lib/auth/login-destination.ts";

test("routes authenticated users from their server-resolved role and profile", () => {
  assert.equal(getLoginDestination({ role: "COACH", coachId: "coach", athleteId: null }), "/dashboard");
  assert.equal(getLoginDestination({ role: "ATHLETE", coachId: null, athleteId: "athlete" }), "/athlete/home");
});

test("rejects missing, mismatched, and admin profile state", () => {
  assert.equal(getLoginDestination({ role: "COACH", coachId: null, athleteId: null }), null);
  assert.equal(getLoginDestination({ role: "ATHLETE", coachId: "coach", athleteId: null }), null);
  assert.equal(getLoginDestination({ role: "ADMIN", coachId: null, athleteId: null }), null);
});
