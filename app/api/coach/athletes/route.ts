import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireCoach } from "@/lib/get-coach";

export async function GET(request: Request) {
  const coach = await requireCoach(request);
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [athletes, pendingInvites] = await Promise.all([
      db.athlete.findMany({
        where: { coachId: coach.id },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      db.inviteToken.findMany({
        where: {
          coachId: coach.id,
          status: "PENDING",
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json(
      {
        athletes: athletes.map((athlete) => ({
          athleteId: athlete.id,
          userId: athlete.userId,
          email: athlete.user.email,
          personalName: athlete.user.name,
          createdAt: athlete.createdAt,
        })),
        pendingInvites: pendingInvites.map((invite) => ({
          inviteId: invite.id,
          email: invite.email,
          token: invite.token,
          inviteUrl: `http://localhost:3001/athlete/invite/${invite.token}`,
          expiresAt: invite.expiresAt,
          status: invite.status,
          createdAt: invite.createdAt,
        })),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        error: "Unable to fetch athletes",
        message: "An unexpected error occurred while fetching coach athletes.",
      },
      { status: 500 },
    );
  }
}
