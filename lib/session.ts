import { randomBytes } from "node:crypto";

import { type Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const SESSION_COOKIE_NAME = "session_token";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  coachId: string | null;
  athleteId: string | null;
};

function sessionExpiryDate() {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
}

export function generateSessionToken() {
  return randomBytes(48).toString("base64url");
}

export async function createSession(userId: string) {
  const token = generateSessionToken();
  const session = await db.userSession.create({
    data: {
      userId,
      token,
      expiresAt: sessionExpiryDate(),
    },
  });
  return session;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getAuthUser(request: Request): Promise<SessionUser | null> {
  const token = request.headers.get("cookie")?.match(/(?:^|;\s*)session_token=([^;]+)/)?.[1];
  if (!token) return null;

  const session = await db.userSession.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          coachProfile: { select: { id: true } },
          athleteProfile: { select: { id: true } },
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await db.userSession.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    coachId: session.user.coachProfile?.id ?? null,
    athleteId: session.user.athleteProfile?.id ?? null,
  };
}

export async function destroySession(token: string) {
  await db.userSession.deleteMany({ where: { token } });
}

export async function requireCoachAuth(request: Request): Promise<SessionUser | null> {
  const user = await getAuthUser(request);
  if (!user || user.role !== "COACH" || !user.coachId) return null;
  return user;
}

export async function requireAthleteAuth(request: Request): Promise<SessionUser | null> {
  const user = await getAuthUser(request);
  if (!user || user.role !== "ATHLETE" || !user.athleteId) return null;
  return user;
}
