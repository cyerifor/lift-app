import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireCoach } from "@/lib/get-coach";

export async function GET(request: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const coach = await requireCoach(request);
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { blockId } = await params;
  if (!blockId) {
    return NextResponse.json({ error: "blockId is required" }, { status: 400 });
  }

  try {
    const block = await db.block.findFirst({
      where: {
        id: blockId,
        coachId: coach.id,
      },
      include: {
        weeks: {
          orderBy: { weekNumber: "asc" },
          include: {
            sessions: {
              orderBy: { scheduledAt: "asc" },
              include: {
                exercises: {
                  orderBy: { orderIndex: "asc" },
                  include: {
                    setPrescriptions: {
                      orderBy: { setNumber: "asc" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    return NextResponse.json(block, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch block outline", message: "An unexpected error occurred while fetching the block." },
      { status: 500 },
    );
  }
}
