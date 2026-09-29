export type AuthorizationIdentity = {
  id: string;
  role: "COACH" | "ATHLETE" | "ADMIN";
  coachProfile: { id: string } | null;
  athleteProfile: { id: string; coachId: string | null } | null;
};

export type AthleteIdentity = { id: string; userId: string; coachId: string | null };

export function isSelfCoachedAthlete(user: AuthorizationIdentity) {
  return user.role === "ATHLETE" && user.athleteProfile !== null && user.athleteProfile.coachId === null;
}

export function canManageAthlete(user: AuthorizationIdentity, athlete: AthleteIdentity) {
  if (user.role === "ATHLETE") {
    return user.athleteProfile?.id === athlete.id && user.id === athlete.userId;
  }

  if (user.role === "COACH") {
    return athlete.coachId !== null && user.coachProfile?.id === athlete.coachId;
  }

  return false;
}
