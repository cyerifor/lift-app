import { db } from "@/lib/db";

export async function requireCoach(request: Request) {
  const coachId = request.headers.get("x-coach-id");
  if (!coachId) return null;

  const coach = await db.coach.findUnique({
    where: { id: coachId },
    include: { user: true },
  });

  if (!coach || coach.user.role !== "COACH") {
    return null;
  }

  return coach;
}
