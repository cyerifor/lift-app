import assert from "node:assert/strict";
import test from "node:test";

import { APIError } from "better-auth";

import { appendSetCookieHeaders, completeSignup } from "../lib/auth/signup-flow.ts";

type FakeState = {
  users: Set<string>;
  profiles: Set<string>;
  settings: Set<string>;
  inviteStatus: "PENDING" | "ACCEPTED";
};

function fakeSignup(state: FakeState, userId: string) {
  return async () => {
    if (state.users.has(userId)) throw new Error("email already exists");
    state.users.add(userId);
    return { headers: new Headers(), response: { user: { id: userId } } };
  };
}

test("failed coach profile creation rolls back auth and permits retry", async () => {
  const state: FakeState = { users: new Set(), profiles: new Set(), settings: new Set(), inviteStatus: "PENDING" };
  const rollbackAuthUser = async (id: string) => void state.users.delete(id);

  await assert.rejects(
    completeSignup({
      signUp: fakeSignup(state, "coach-user"),
      createProfile: async () => {
        throw new Error("forced coach transaction failure");
      },
      rollbackAuthUser,
    }),
    /forced coach transaction failure/,
  );
  assert.deepEqual([...state.users], []);
  assert.deepEqual([...state.profiles], []);
  assert.deepEqual([...state.settings], []);

  await completeSignup({
    signUp: fakeSignup(state, "coach-user"),
    createProfile: async (id) => {
      state.profiles.add(id);
      state.settings.add(id);
      return id;
    },
    rollbackAuthUser,
  });
  assert.equal(state.users.has("coach-user"), true);
  assert.equal(state.profiles.has("coach-user"), true);
  assert.equal(state.settings.has("coach-user"), true);
});

test("failed athlete transaction rolls back auth and leaves invite pending for retry", async () => {
  const state: FakeState = { users: new Set(), profiles: new Set(), settings: new Set(), inviteStatus: "PENDING" };
  const rollbackAuthUser = async (id: string) => void state.users.delete(id);

  await assert.rejects(
    completeSignup({
      signUp: fakeSignup(state, "athlete-user"),
      createProfile: async () => {
        // A real Prisma transaction does not commit any of these writes when it throws.
        throw new Error("forced athlete transaction failure");
      },
      rollbackAuthUser,
    }),
    /forced athlete transaction failure/,
  );
  assert.equal(state.users.has("athlete-user"), false);
  assert.equal(state.inviteStatus, "PENDING");
  assert.deepEqual([...state.profiles], []);
  assert.deepEqual([...state.settings], []);

  await completeSignup({
    signUp: fakeSignup(state, "athlete-user"),
    createProfile: async (id) => {
      state.profiles.add(id);
      state.settings.add(id);
      state.inviteStatus = "ACCEPTED";
      return id;
    },
    rollbackAuthUser,
  });
  assert.equal(state.inviteStatus, "ACCEPTED");
});

test("forwards every Set-Cookie value and no unrelated headers", () => {
  const source = new Headers({ "x-internal": "do-not-forward" });
  source.append("set-cookie", "first=one; Path=/; HttpOnly");
  source.append("set-cookie", "second=two; Path=/; SameSite=Lax");
  const target = new Headers();

  appendSetCookieHeaders(source, target);

  assert.deepEqual(target.getSetCookie(), [
    "first=one; Path=/; HttpOnly",
    "second=two; Path=/; SameSite=Lax",
  ]);
  assert.equal(target.has("x-internal"), false);
});

test("duplicate athlete signup never enters the profile transaction or consumes the invite", async () => {
  let profileTransactionStarted = false;
  let inviteStatus: "PENDING" | "ACCEPTED" = "PENDING";

  await assert.rejects(
    completeSignup({
      signUp: async () => {
        throw new APIError("UNPROCESSABLE_ENTITY", {
          code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
          message: "User already exists. Use another email.",
        });
      },
      createProfile: async () => {
        profileTransactionStarted = true;
        inviteStatus = "ACCEPTED";
      },
      rollbackAuthUser: async () => undefined,
    }),
    (error: unknown) => error instanceof APIError && error.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
  );

  assert.equal(profileTransactionStarted, false);
  assert.equal(inviteStatus, "PENDING");
});
