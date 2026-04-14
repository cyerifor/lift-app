import { db } from "@/lib/db";

export async function requireAthlete(request: Request) {
  const athleteId = request.headers.get("x-athlete-id");
  if (!athleteId) return null;

  const athlete = await db.athlete.findUnique({
    where: { id: athleteId },
    include: { user: true, coach: true },
  });

  if (!athlete || athlete.user.role !== "ATHLETE") return null;
  return athlete;
}
