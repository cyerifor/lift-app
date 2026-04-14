import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireCoach } from "@/lib/get-coach";

const createBlockSchema = z.object({
  athleteId: z.string().min(1, "athleteId is required"),
  name: z.string().min(1, "name is required").max(120),
  lengthWeeks: z.number().int().min(3, "lengthWeeks must be between 3 and 12").max(12),
  sessionsPerWeek: z.number().int().min(3, "sessionsPerWeek must be between 3 and 5").max(5),
  startDate: z.string().min(1, "startDate is required"),
  notes: z.string().optional(),
});

const sessionDayTemplate: Record<number, number[]> = {
  3: [1, 3, 5], // Mon, Wed, Fri
  4: [1, 3, 4, 5], // Mon, Wed, Thu, Fri
  5: [1, 2, 3, 4, 5], // Mon-Fri
};

function getStartOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function weekRangeFrom(startDate: Date, weekOffset: number) {
  const start = new Date(startDate);
  start.setDate(start.getDate() + weekOffset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

function dateFromWeekday(weekStart: Date, weekday: number) {
  const date = new Date(weekStart);
  const startDay = date.getDay(); // 0 = Sun
  const delta = weekday - startDay;
  date.setDate(date.getDate() + delta);
  return date;
}

export async function POST(request: Request) {
  const coach = await requireCoach(request);
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof createBlockSchema>;
  try {
    const body = await request.json();
    payload = createBlockSchema.parse(body);
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

  const parsedStartDate = new Date(payload.startDate);
  if (Number.isNaN(parsedStartDate.getTime())) {
    return NextResponse.json({ error: "Validation failed", details: [{ path: "startDate", message: "Invalid date format" }] }, { status: 400 });
  }
  const today = getStartOfDay(new Date());
  if (getStartOfDay(parsedStartDate) < today) {
    return NextResponse.json(
      { error: "Validation failed", details: [{ path: "startDate", message: "startDate must be today or in the future" }] },
      { status: 400 },
    );
  }

  const athlete = await db.athlete.findFirst({
    where: { id: payload.athleteId, coachId: coach.id },
  });
  if (!athlete) {
    return NextResponse.json({ error: "Athlete not found for this coach" }, { status: 404 });
  }

  try {
    const endDate = new Date(parsedStartDate);
    endDate.setDate(endDate.getDate() + payload.lengthWeeks * 7 - 1);

    const created = await db.$transaction(async (tx) => {
      const block = await tx.block.create({
        data: {
          coachId: coach.id,
          athleteId: payload.athleteId,
          title: payload.name,
          goal: payload.notes ?? null,
          status: "DRAFT",
          startDate: parsedStartDate,
          endDate,
          notes: payload.notes ?? null,
        },
      });

      const weekdays = sessionDayTemplate[payload.sessionsPerWeek];

      for (let i = 0; i < payload.lengthWeeks; i++) {
        const { start, end } = weekRangeFrom(parsedStartDate, i);
        const week = await tx.week.create({
          data: {
            blockId: block.id,
            weekNumber: i + 1,
            startDate: start,
            endDate: end,
            objective: null,
          },
        });

        for (const weekday of weekdays) {
          const scheduledAt = dateFromWeekday(start, weekday);
          await tx.session.create({
            data: {
              weekId: week.id,
              title: `Week ${i + 1} Session`,
              scheduledAt,
              status: "PLANNED",
              notes: null,
            },
          });
        }
      }

      return block;
    });

    return NextResponse.json(
      {
        blockId: created.id,
        name: created.title,
        lengthWeeks: payload.lengthWeeks,
        sessionsPerWeek: payload.sessionsPerWeek,
        status: created.status,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to create block", message: "An unexpected error occurred while creating the block." },
      { status: 500 },
    );
  }
}
