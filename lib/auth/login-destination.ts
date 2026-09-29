export type SessionIdentity = {
  role: "COACH" | "ATHLETE" | "ADMIN";
  coachId: string | null;
  athleteId: string | null;
};

export function getLoginDestination(identity: SessionIdentity) {
  if (identity.role === "COACH" && identity.coachId) return "/dashboard";
  if (identity.role === "ATHLETE" && identity.athleteId) return "/athlete/home";
  return null;
}
