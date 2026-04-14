import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, clearSessionCookie, destroySession } from "@/lib/session";

function readSessionToken(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
}

export async function POST(request: Request) {
  const token = readSessionToken(request);
  if (token) await destroySession(token);

  const response = NextResponse.json({ ok: true }, { status: 200 });
  clearSessionCookie(response);
  return response;
}
