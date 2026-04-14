import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { validatePassword } from "@/lib/auth";
import { createSession, setSessionCookie } from "@/lib/session";

const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

type CoachBio = {
  businessName?: string;
  passwordHash?: string;
};

function parseCoachBio(raw: string | null): CoachBio {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as CoachBio;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  let payload: z.infer<typeof loginSchema>;

  try {
    const body = await request.json();
    payload = loginSchema.parse(body);
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
    const user = await db.user.findUnique({
      where: { email: payload.email },
      include: {
        coachProfile: true,
      },
    });

    if (!user || !user.coachProfile) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const coach = user.coachProfile;
    const coachBio = parseCoachBio(coach.bio);
    const storedPasswordHash = coachBio.passwordHash;

    if (!storedPasswordHash) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValidPassword = await validatePassword(payload.password, storedPasswordHash);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const session = await createSession(user.id);
    const response = NextResponse.json(
      {
        sessionToken: session.token,
        coachId: coach.id,
        businessName: coachBio.businessName ?? user.name ?? "Coach",
        tier: coach.specialty ?? "STARTER",
        role: user.role,
      },
      { status: 200 },
    );

    setSessionCookie(response, session.token);

    return response;
  } catch {
    return NextResponse.json(
      {
        error: "Unable to sign in",
        message: "An unexpected error occurred while signing in.",
      },
      { status: 500 },
    );
  }
}
