import { getAuthenticatedUser } from "@/lib/auth/authorization";
import { canManageAthlete } from "@/lib/auth/policy";
import { db } from "@/lib/db";

export type ExerciseLibraryAccess =
  | { ok: true; athleteId: string }
  | { ok: false; status: 400 | 401 | 403; message: string };

export async function resolveExerciseLibraryAthlete(
  request: Request,
  requestedAthleteId?: string,
): Promise<ExerciseLibraryAccess> {
  const user = await getAuthenticatedUser(request);
  if (!user) return { ok: false, status: 401, message: "Unauthorized" };

  if (user.role === "ATHLETE") {
    const athlete = user.athleteProfile;
    if (!athlete) return { ok: false, status: 403, message: "Athlete profile required" };
    if (requestedAthleteId && requestedAthleteId !== athlete.id) {
      return { ok: false, status: 403, message: "Forbidden" };
    }
    return { ok: true, athleteId: athlete.id };
  }

  if (user.role === "COACH") {
    if (!requestedAthleteId) return { ok: false, status: 400, message: "athleteId is required for coaches" };
    const athlete = await db.athlete.findUnique({ where: { id: requestedAthleteId } });
    if (!athlete || !canManageAthlete(user, athlete)) return { ok: false, status: 403, message: "Forbidden" };
    return { ok: true, athleteId: athlete.id };
  }

  return { ok: false, status: 403, message: "Forbidden" };
}
