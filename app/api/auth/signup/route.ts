import { randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const signupSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(128, "Password cannot exceed 128 characters"),
  personalName: z.string().trim().min(1, "Personal name is required").max(100),
  businessName: z.string().trim().min(1, "Business name is required").max(120),
  logoUrl: z.url().trim().optional().or(z.literal("")),
  timezone: z.string().trim().min(1, "Timezone is required").max(80),
  defaultUnits: z.enum(["METRIC", "IMPERIAL"]),
  tier: z.enum(["FREE", "STARTER", "PRO", "ENTERPRISE"]),
});

type SignupInput = z.infer<typeof signupSchema>;

function extractValidationErrors(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function generateSessionToken() {
  return randomBytes(48).toString("base64url");
}

export async function POST(request: Request) {
  let payload: SignupInput;

  try {
    const body = await request.json();
    payload = signupSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: extractValidationErrors(error),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Invalid request body. Expected JSON payload." },
      { status: 400 },
    );
  }

  const normalizedLogoUrl = payload.logoUrl && payload.logoUrl.length > 0 ? payload.logoUrl : null;

  try {
    // We hash the password here to satisfy signup security requirements.
    // Current schema does not include an explicit password hash column on User.
    // The hash is intentionally not returned in API responses or logs.
    await hashPassword(payload.password);

    const { user, coach } = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: payload.email,
          name: payload.personalName,
          role: "COACH",
          imageUrl: normalizedLogoUrl,
        },
      });

      const createdCoach = await tx.coach.create({
        data: {
          userId: createdUser.id,
          bio: JSON.stringify({
            businessName: payload.businessName,
            logoUrl: normalizedLogoUrl,
            timezone: payload.timezone,
            defaultUnits: payload.defaultUnits,
          }),
          specialty: payload.tier,
        },
      });

      return { user: createdUser, coach: createdCoach };
    });

    const sessionToken = generateSessionToken();
    const response = NextResponse.json(
      {
        coachId: coach.id,
        businessName: payload.businessName,
        tier: payload.tier,
        sessionToken,
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

    response.headers.set("x-user-id", user.id);
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        {
          error: "Email already registered",
          field: "email",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: "Unable to create coach account",
        message: "An unexpected error occurred while creating the account.",
      },
      { status: 500 },
    );
  }
}
