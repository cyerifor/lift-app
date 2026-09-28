import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/authorization";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      coachId: user.coachProfile?.id ?? null,
      athleteId: user.athleteProfile?.id ?? null,
      settings: user.settings,
    },
    { status: 200 },
  );
}
