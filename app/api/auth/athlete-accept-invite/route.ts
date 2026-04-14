import { randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const acceptInviteSchema = z.object({
  inviteToken: z.string().min(1),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
  personalName: z.string().min(1).max(100),
  dob: z.string().min(1),
  gender: z.enum(["Male", "Female", "Other"]),
  bodyweight: z.coerce.number().positive(),
  competitionDate: z.string().optional().or(z.literal("")),
  squatMax: z.coerce.number().nonnegative(),
  benchMax: z.coerce.number().nonnegative(),
  deadliftMax: z.coerce.number().nonnegative(),
  goals: z.enum(["competition_prep", "strength", "hypertrophy", "general"]),
  trainingAge: z.string().min(1),
  injuries: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type CoachBio = {
  businessName?: string;
  logoUrl?: string;
};

function generateSessionToken() {
  return randomBytes(48).toString("base64url");
}

function parseCoachBio(raw: string | null): CoachBio {
  if (!raw) return {};
  try {
    return (JSON.parse(raw) as CoachBio) ?? {};
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const invite = await db.inviteToken.findUnique({
    where: { token },
    select: { email: true, expiresAt: true, usedAt: true, status: true },
  });

  if (!invite || invite.usedAt || invite.expiresAt <= new Date() || invite.status !== "PENDING") {
    return NextResponse.json({ error: "Invite token is invalid or expired" }, { status: 410 });
  }

  return NextResponse.json({ email: invite.email, expiresAt: invite.expiresAt }, { status: 200 });
}

export async function POST(request: Request) {
  let payload: z.infer<typeof acceptInviteSchema>;
  try {
    payload = acceptInviteSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid request body. Expected JSON payload." }, { status: 400 });
  }

  try {
    const invite = await db.inviteToken.findUnique({
      where: { token: payload.inviteToken },
      include: {
        coach: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!invite || invite.usedAt || invite.expiresAt <= new Date() || invite.status !== "PENDING") {
      return NextResponse.json({ error: "Invite token expired or already used" }, { status: 410 });
    }

    if (invite.email && invite.email !== payload.email) {
      return NextResponse.json(
        { error: "Validation failed", details: [{ path: "email", message: "Email does not match invite token" }] },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(payload.password);
    const dateOfBirth = new Date(payload.dob);
    if (Number.isNaN(dateOfBirth.getTime())) {
      return NextResponse.json(
        { error: "Validation failed", details: [{ path: "dob", message: "Invalid date of birth" }] },
        { status: 400 },
      );
    }

    const competitionDate = payload.competitionDate ? new Date(payload.competitionDate) : null;
    if (payload.competitionDate && competitionDate && Number.isNaN(competitionDate.getTime())) {
      return NextResponse.json(
        { error: "Validation failed", details: [{ path: "competitionDate", message: "Invalid competition date" }] },
        { status: 400 },
      );
    }

    const created = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: payload.email,
          name: payload.personalName,
          role: "ATHLETE",
        },
      });

      const athlete = await tx.athlete.create({
        data: {
          userId: user.id,
          coachId: invite.coachId,
          dateOfBirth,
          notes: JSON.stringify({
            gender: payload.gender,
            bodyweight: payload.bodyweight,
            competitionDate: competitionDate?.toISOString() ?? null,
            squatMax: payload.squatMax,
            benchMax: payload.benchMax,
            deadliftMax: payload.deadliftMax,
            goals: payload.goals,
            trainingAge: payload.trainingAge,
            injuries: payload.injuries || null,
            notes: payload.notes || null,
            passwordHash,
          }),
        },
      });

      await tx.inviteToken.update({
        where: { id: invite.id },
        data: {
          usedAt: new Date(),
          status: "ACCEPTED",
          athleteId: athlete.id,
        },
      });

      return { user, athlete };
    });

    const coachBio = parseCoachBio(invite.coach.bio);
    const sessionToken = generateSessionToken();

    const response = NextResponse.json(
      {
        athleteId: created.athlete.id,
        coachId: invite.coachId,
        sessionToken,
        businessName: coachBio.businessName ?? invite.coach.user.name ?? "Coach",
        logoUrl: coachBio.logoUrl ?? null,
      },
      { status: 201 },
    );

    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    return NextResponse.json(
      {
        error: "Unable to accept invite",
        message: "An unexpected error occurred while creating athlete account.",
      },
      { status: 500 },
    );
  }
}
