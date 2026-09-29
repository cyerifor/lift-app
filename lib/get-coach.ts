import { db } from "@/lib/db";
import { requireCoachUser } from "@/lib/auth/authorization";

export async function requireCoach(request: Request) {
  const authUser = await requireCoachUser(request);
  if (!authUser?.coachProfile) return null;
  return db.coach.findUnique({
    where: { id: authUser.coachProfile.id },
    include: { user: true },
  });
}
