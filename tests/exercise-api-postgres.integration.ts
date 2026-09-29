import assert from "node:assert/strict";
import test from "node:test";

const databaseUrl = process.env.TEST_DATABASE_URL;

function cookiesFrom(headers: Headers) {
  return headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
}

test(
  "Exercise API derives athlete ownership from Better Auth and denies unrelated identities",
  { skip: !databaseUrl, timeout: 30_000 },
  async () => {
    process.env.DATABASE_URL = databaseUrl;
    process.env.DIRECT_URL = databaseUrl;
    process.env.BETTER_AUTH_SECRET ??= "integration-test-secret-at-least-32-characters";
    process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
    const [{ db }, { auth }, exerciseRoute, compatibilityRoute] = await Promise.all([
      import("../lib/db.ts"),
      import("../lib/auth.ts"),
      import("../app/api/exercises/route.ts"),
      import("../app/api/coach/exercise-library/route.ts"),
    ]);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const emails = [`owner-${suffix}@example.test`, `coach-${suffix}@example.test`, `other-${suffix}@example.test`];
    const password = "integration-password-123";
    let compatibilityBlockId: string | null = null;

    try {
      const ownerSignup = await auth.api.signUpEmail({
        body: { email: emails[0], password, name: "Owner" },
        returnHeaders: true,
      });
      const owner = await db.athlete.create({ data: { userId: ownerSignup.response.user.id } });

      const coachSignup = await auth.api.signUpEmail({
        body: { email: emails[1], password, name: "Assigned Coach" },
        returnHeaders: true,
      });
      await db.user.update({ where: { id: coachSignup.response.user.id }, data: { role: "COACH" } });
      const coach = await db.coach.create({ data: { userId: coachSignup.response.user.id } });
      await db.athlete.update({ where: { id: owner.id }, data: { coachId: coach.id } });

      const otherSignup = await auth.api.signUpEmail({
        body: { email: emails[2], password, name: "Other Athlete" },
        returnHeaders: true,
      });
      const other = await db.athlete.create({ data: { userId: otherSignup.response.user.id } });

      const ownerResponse = await exerciseRoute.GET(
        new Request("http://localhost:3000/api/exercises", { headers: { cookie: cookiesFrom(ownerSignup.headers) } }),
      );
      assert.equal(ownerResponse.status, 200);
      assert.equal(((await ownerResponse.json()) as unknown[]).length, 117);

      const coachResponse = await exerciseRoute.GET(
        new Request(`http://localhost:3000/api/exercises?athleteId=${owner.id}`, {
          headers: { cookie: cookiesFrom(coachSignup.headers) },
        }),
      );
      assert.equal(coachResponse.status, 200);

      const compatibilityBlock = await db.block.create({
        data: {
          coachId: coach.id,
          athleteId: owner.id,
          title: "Exercise library compatibility",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-02-01"),
        },
      });
      compatibilityBlockId = compatibilityBlock.id;
      const compatibilityResponse = await compatibilityRoute.GET(
        new Request(`http://localhost:3000/api/coach/exercise-library?blockId=${compatibilityBlock.id}`, {
          headers: { cookie: cookiesFrom(coachSignup.headers) },
        }),
      );
      assert.equal(compatibilityResponse.status, 200);
      const compatibilityLibrary = (await compatibilityResponse.json()) as Array<{
        mainLift: string;
        progEligible: boolean;
      }>;
      assert.equal(compatibilityLibrary.length, 117);
      assert.ok(["squat", "bench", "deadlift", "accessory"].includes(compatibilityLibrary[0].mainLift));
      assert.equal(typeof compatibilityLibrary[0].progEligible, "boolean");

      const crossAthleteResponse = await exerciseRoute.GET(
        new Request(`http://localhost:3000/api/exercises?athleteId=${owner.id}`, {
          headers: { cookie: cookiesFrom(otherSignup.headers) },
        }),
      );
      assert.equal(crossAthleteResponse.status, 403);

      const crossCoachTarget = await exerciseRoute.GET(
        new Request(`http://localhost:3000/api/exercises?athleteId=${other.id}`, {
          headers: { cookie: cookiesFrom(coachSignup.headers) },
        }),
      );
      assert.equal(crossCoachTarget.status, 403);
    } finally {
      if (compatibilityBlockId) {
        await db.block.deleteMany({ where: { id: compatibilityBlockId } });
      }
      await db.user.deleteMany({ where: { email: { in: emails } } });
      await db.$disconnect();
    }
  },
);
