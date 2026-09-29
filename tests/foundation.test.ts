import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Prisma uses pooled and direct PostgreSQL connections with nullable coach assignment", async () => {
  const schema = await read("prisma/schema.prisma");
  assert.match(schema, /provider\s*=\s*"postgresql"/);
  assert.match(schema, /directUrl\s*=\s*env\("DIRECT_URL"\)/);
  assert.match(schema, /coachId\s+String\?/);
  assert.match(schema, /model SessionAccount/);
  assert.doesNotMatch(schema, /model UserSession/);
});

test("baseline migration creates Better Auth and settings tables", async () => {
  const migration = await read("prisma/migrations/20260928000000_powercoach_m1a_foundation/migration.sql");
  for (const table of ["User", "AuthSession", "Account", "Verification", "UserSettings"]) {
    assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
  }
  assert.match(migration, /"coachId" TEXT,/);
});

test("legacy identity headers and session token storage are absent from runtime code", async () => {
  const files = [
    "lib/get-athlete.ts",
    "lib/get-coach.ts",
    "app/auth/login/page.tsx",
    "app/auth/signup/page.tsx",
    "app/athlete/home/page.tsx",
  ];
  const runtime = (await Promise.all(files.map(read))).join("\n");
  assert.doesNotMatch(runtime, /x-(?:coach|athlete)-id/);
  assert.doesNotMatch(runtime, /session_token|sessionToken/);
  assert.doesNotMatch(runtime, /localStorage.*(?:coach_id|athlete_id)/);
});

test("M1B preserves the approved Exercise and ExerciseSlot physical-table mappings", async () => {
  const schema = await read("prisma/schema.prisma");
  assert.match(schema, /model ExerciseSlot[\s\S]*@@map\("Exercise"\)/);
  assert.match(schema, /exerciseId\s+String\?\s+@map\("exerciseTemplateId"\)/);
  assert.match(schema, /model Exercise[\s\S]*@@map\("ExerciseTemplate"\)/);
  assert.match(schema, /@@unique\(\[athleteId, normalizedName\]\)/);
});
