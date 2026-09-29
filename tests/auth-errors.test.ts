import assert from "node:assert/strict";
import test from "node:test";

import { APIError } from "better-auth";

import { getBetterAuthSignupConflictStatus, isBetterAuthDuplicateUserError } from "../lib/auth/errors.ts";

test("recognizes Better Auth duplicate-email errors for deterministic signup conflicts", () => {
  for (const code of ["USER_ALREADY_EXISTS", "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"]) {
    const error = new APIError("UNPROCESSABLE_ENTITY", { code, message: "User already exists" });
    assert.equal(isBetterAuthDuplicateUserError(error), true);
    assert.equal(getBetterAuthSignupConflictStatus(error), 409);
  }
});

test("does not misclassify other Better Auth API errors", () => {
  const error = new APIError("BAD_REQUEST", { code: "INVALID_EMAIL", message: "Invalid email" });
  assert.equal(isBetterAuthDuplicateUserError(error), false);
  assert.equal(getBetterAuthSignupConflictStatus(error), null);
  assert.equal(isBetterAuthDuplicateUserError(new Error("User already exists")), false);
});
