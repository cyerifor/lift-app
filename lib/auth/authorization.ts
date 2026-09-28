import type { Athlete, Coach, Role, User, UserSettings } from "@prisma/client";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageAthlete } from "@/lib/auth/policy";

export { canManageAthlete, isSelfCoachedAthlete } from "@/lib/auth/policy";

export type AuthenticatedUser = User & {
  settings: UserSettings | null;
  coachProfile: Coach | null;
  athleteProfile: Athlete | null;
};

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user.id) return null;

  return db.user.findUnique({
    where: { id: session.user.id },
    include: { settings: true, coachProfile: true, athleteProfile: true },
  });
}

export async function requireAuthenticatedUser(request: Request) {
  return getAuthenticatedUser(request);
}

export function hasRole(user: AuthenticatedUser, role: Role) {
  return user.role === role;
}

export async function requireCoachUser(request: Request) {
  const user = await getAuthenticatedUser(request);
  return user && hasRole(user, "COACH") && user.coachProfile ? user : null;
}

export async function requireAthleteUser(request: Request) {
  const user = await getAuthenticatedUser(request);
  return user && hasRole(user, "ATHLETE") && user.athleteProfile ? user : null;
}

export async function requireAthleteManager(request: Request, athleteId: string) {
  const [user, athlete] = await Promise.all([
    getAuthenticatedUser(request),
    db.athlete.findUnique({ where: { id: athleteId } }),
  ]);

  if (!user || !athlete || !canManageAthlete(user, athlete)) return null;
  return { user, athlete };
}
