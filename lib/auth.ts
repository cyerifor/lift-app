import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

import { db } from "@/lib/db";

export type AppRole = "COACH" | "ATHLETE";

export const auth = betterAuth({
  appName: "PowerCoach",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "ATHLETE",
        input: false,
      },
    },
  },
  session: {
    modelName: "SessionAccount",
    // 7 days
    expiresIn: 60 * 60 * 24 * 7,
    // Refresh session age daily
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
});

type CreateSessionArgs = {
  email: string;
  password: string;
  headers: Headers;
  rememberMe?: boolean;
};

export async function createSession({
  email,
  password,
  headers,
  rememberMe = true,
}: CreateSessionArgs) {
  return auth.api.signInEmail({
    body: {
      email,
      password,
      rememberMe,
    },
    headers,
  });
}

export async function validateSession(headers: Headers) {
  return auth.api.getSession({
    headers,
  });
}
