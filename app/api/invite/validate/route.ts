import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    const invite = await db.inviteToken.findUnique({
      where: { token },
      include: {
        coach: true,
      },
    });

    if (!invite || invite.usedAt || invite.expiresAt <= new Date() || invite.status !== "PENDING") {
      return NextResponse.json({ error: "Invite token is invalid or expired" }, { status: 410 });
    }

    return NextResponse.json(
      {
        valid: true,
        email: invite.email,
        coachId: invite.coachId,
        expiresAt: invite.expiresAt,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        error: "Unable to validate invite token",
      },
      { status: 500 },
    );
  }
}
