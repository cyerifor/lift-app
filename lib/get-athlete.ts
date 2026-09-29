import { db } from "@/lib/db";
import { requireAthleteUser } from "@/lib/auth/authorization";

export async function requireAthlete(request: Request) {
  const authUser = await requireAthleteUser(request);
  if (!authUser?.athleteProfile) return null;
  return db.athlete.findUnique({
    where: { id: authUser.athleteProfile.id },
    include: { user: true, coach: true },
  });
}
