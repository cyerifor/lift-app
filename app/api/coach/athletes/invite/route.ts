import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireCoach } from "@/lib/get-coach";

const inviteSchema = z.object({
  email: z.string().email().trim().toLowerCase().optional().or(z.literal("")),
  sendInviteEmail: z.boolean().optional(),
});

function normalizeCoachTier(tier: string | null | undefined) {
  const normalized = (tier ?? "STARTER").toUpperCase();
  if (normalized === "PRO") return "PRO";
  if (normalized === "SCALE") return "SCALE";
  return "STARTER";
}

function tierLimit(tier: "STARTER" | "PRO" | "SCALE") {
  if (tier === "STARTER") return 5;
  if (tier === "PRO") return 25;
  return Number.POSITIVE_INFINITY;
}

export async function POST(request: Request) {
  const coach = await requireCoach(request);
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof inviteSchema>;
  try {
    const body = await request.json();
    payload = inviteSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid request body. Expected JSON payload." }, { status: 400 });
  }

  try {
    const emailLock = payload.email && payload.email.length > 0 ? payload.email : null;
    const tier = normalizeCoachTier(coach.specialty);

    const [athleteCount, pendingInvitesCount] = await Promise.all([
      db.athlete.count({ where: { coachId: coach.id } }),
      db.inviteToken.count({
        where: {
          coachId: coach.id,
          status: "PENDING",
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    const capacity = tierLimit(tier);
    if (athleteCount + pendingInvitesCount >= capacity) {
      return NextResponse.json(
        { error: "Tier athlete limit reached. Upgrade tier to invite more athletes." },
        { status: 409 },
      );
    }

    if (emailLock) {
      const existingInvite = await db.inviteToken.findFirst({
        where: {
          coachId: coach.id,
          email: emailLock,
          status: "PENDING",
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (existingInvite) {
        return NextResponse.json({ error: "Email already invited" }, { status: 409 });
      }
    }

    const inviteToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const existingAthlete = emailLock
      ? await db.athlete.findFirst({
          where: {
            coachId: coach.id,
            user: { email: emailLock },
          },
        })
      : null;

    const createdInvite = await db.inviteToken.create({
      data: {
        coachId: coach.id,
        athleteId: existingAthlete?.id ?? null,
        email: emailLock,
        token: inviteToken,
        sendInviteEmail: Boolean(payload.sendInviteEmail),
        status: "PENDING",
        expiresAt,
      },
    });

    return NextResponse.json(
      {
        athleteId: existingAthlete?.id ?? null,
        inviteToken: createdInvite.token,
        inviteUrl: `http://localhost:3001/athlete/invite/${createdInvite.token}`,
        expiresAt: createdInvite.expiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Invite creation failed", error);
    return NextResponse.json(
      {
        error: "Unable to create invite",
        message: "An unexpected error occurred while creating the athlete invite.",
      },
      { status: 500 },
    );
  }
}
