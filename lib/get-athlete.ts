import { db } from "@/lib/db";
import { requireAthleteAuth } from "@/lib/session";

export async function requireAthlete(request: Request) {
  const authUser = await requireAthleteAuth(request);
  if (authUser?.athleteId) {
    const athleteFromSession = await db.athlete.findUnique({
      where: { id: authUser.athleteId },
      include: { user: true, coach: true },
    });
    if (athleteFromSession) return athleteFromSession;
  }

  const athleteId = request.headers.get("x-athlete-id");
  if (!athleteId) return null;

  const athlete = await db.athlete.findUnique({
    where: { id: athleteId },
    include: { user: true, coach: true },
  });

  if (!athlete || athlete.user.role !== "ATHLETE") return null;
  return athlete;
}
