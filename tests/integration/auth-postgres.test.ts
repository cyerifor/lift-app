import assert from "node:assert/strict";
import test from "node:test";

const databaseUrl = process.env.TEST_DATABASE_URL;

function cookieHeader(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
}

test(
  "Better Auth signup, me, sign-out invalidation, sign-in, and invited athlete session work on PostgreSQL",
  { timeout: 30_000 },
  async () => {
    assert.ok(databaseUrl, "TEST_DATABASE_URL is required for the PostgreSQL M1A integration suite.");
    process.env.DATABASE_URL = databaseUrl;
    process.env.DIRECT_URL = databaseUrl;
    process.env.BETTER_AUTH_SECRET ??= "integration-test-secret-at-least-32-characters";
    process.env.BETTER_AUTH_URL ??= "http://localhost:3000";

    const [{ db }, coachSignup, athleteSignup, meRoute, authRoute] = await Promise.all([
      import("@/lib/db"),
      import("@/app/api/auth/signup/route"),
      import("@/app/api/auth/athlete-accept-invite/route"),
      import("@/app/api/auth/me/route"),
      import("@/app/api/auth/[...all]/route"),
    ]);

    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const coachEmail = `coach-${suffix}@example.test`;
    const athleteEmail = `athlete-${suffix}@example.test`;
    const password = "integration-password-123";

    try {
      const form = new FormData();
      Object.entries({
        email: coachEmail,
        password,
        personalName: "Integration Coach",
        businessName: "Integration Strength",
        timezone: "GMT",
        defaultUnits: "kg",
        tier: "STARTER",
      }).forEach(([key, value]) => form.set(key, value));
      const coachResponse = await coachSignup.POST(
        new Request("http://localhost:3000/api/auth/signup", { method: "POST", body: form }),
      );
      assert.equal(coachResponse.status, 201);
      assert.ok(coachResponse.headers.getSetCookie().length > 0);
      const coachCookie = cookieHeader(coachResponse);

      const meResponse = await meRoute.GET(
        new Request("http://localhost:3000/api/auth/me", { headers: { cookie: coachCookie } }),
      );
      assert.equal(meResponse.status, 200);
      const coachMe = (await meResponse.json()) as { role: string; coachId: string | null };
      assert.equal(coachMe.role, "COACH");
      assert.ok(coachMe.coachId);

      const duplicateCoachResponse = await coachSignup.POST(
        new Request("http://localhost:3000/api/auth/signup", { method: "POST", body: form }),
      );
      assert.equal(duplicateCoachResponse.status, 409);

      const signOutResponse = await authRoute.POST(
        new Request("http://localhost:3000/api/auth/sign-out", {
          method: "POST",
          headers: { cookie: coachCookie, origin: "http://localhost:3000" },
        }),
      );
      assert.equal(signOutResponse.status, 200);
      assert.equal(
        (
          await meRoute.GET(new Request("http://localhost:3000/api/auth/me", { headers: { cookie: coachCookie } }))
        ).status,
        401,
      );

      const signInResponse = await authRoute.POST(
        new Request("http://localhost:3000/api/auth/sign-in/email", {
          method: "POST",
          headers: { "content-type": "application/json", origin: "http://localhost:3000" },
          body: JSON.stringify({ email: coachEmail, password }),
        }),
      );
      assert.equal(signInResponse.status, 200);
      assert.ok(signInResponse.headers.getSetCookie().length > 0);

      const invite = await db.inviteToken.create({
        data: {
          coachId: coachMe.coachId!,
          email: athleteEmail,
          token: `integration-${suffix}`,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      const athleteResponse = await athleteSignup.POST(
        new Request("http://localhost:3000/api/auth/athlete-accept-invite", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            inviteToken: invite.token,
            email: athleteEmail,
            password,
            personalName: "Integration Athlete",
            dob: "1990-01-01",
            gender: "Other",
            bodyweight: 80,
            competitionDate: "",
            squatMax: 0,
            benchMax: 0,
            deadliftMax: 0,
            goals: "strength",
            trainingAge: "1",
            injuries: "",
            notes: "",
          }),
        }),
      );
      assert.equal(athleteResponse.status, 201);
      assert.ok(athleteResponse.headers.getSetCookie().length > 0);
      const athleteMeResponse = await meRoute.GET(
        new Request("http://localhost:3000/api/auth/me", { headers: { cookie: cookieHeader(athleteResponse) } }),
      );
      assert.equal(athleteMeResponse.status, 200);
      const athleteMe = (await athleteMeResponse.json()) as { role: string; athleteId: string | null };
      assert.equal(athleteMe.role, "ATHLETE");
      assert.ok(athleteMe.athleteId);

      const retryInvite = await db.inviteToken.create({
        data: {
          coachId: coachMe.coachId!,
          email: athleteEmail,
          token: `duplicate-${suffix}`,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      const duplicateAthleteResponse = await athleteSignup.POST(
        new Request("http://localhost:3000/api/auth/athlete-accept-invite", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            inviteToken: retryInvite.token,
            email: athleteEmail,
            password,
            personalName: "Duplicate Athlete",
            dob: "1990-01-01",
            gender: "Other",
            bodyweight: 80,
            competitionDate: "",
            squatMax: 0,
            benchMax: 0,
            deadliftMax: 0,
            goals: "strength",
            trainingAge: "1",
            injuries: "",
            notes: "",
          }),
        }),
      );
      assert.equal(duplicateAthleteResponse.status, 409);
      assert.equal((await db.inviteToken.findUniqueOrThrow({ where: { id: retryInvite.id } })).status, "PENDING");
    } finally {
      await db.user.deleteMany({ where: { email: { in: [coachEmail, athleteEmail] } } });
      await db.$disconnect();
    }
  },
);
