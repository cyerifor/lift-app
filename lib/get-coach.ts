import { db } from "@/lib/db";
import { requireCoachAuth } from "@/lib/session";

export async function requireCoach(request: Request) {
  const authUser = await requireCoachAuth(request);
  if (authUser?.coachId) {
    const coachFromSession = await db.coach.findUnique({
      where: { id: authUser.coachId },
      include: { user: true },
    });
    if (coachFromSession) return coachFromSession;
  }

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
