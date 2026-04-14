import { prismaAdapter } from "@better-auth/prisma-adapter";
import { hashPassword as betterAuthHashPassword, verifyPassword } from "better-auth/crypto";
import { betterAuth } from "better-auth";

import { db } from "@/lib/db";

export type AppRole = "COACH" | "ATHLETE";

export const auth = betterAuth({
  appName: "Lift App",
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: betterAuthHashPassword,
      verify: verifyPassword,
    },
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
    // 7 days
    expiresIn: 60 * 60 * 24 * 7,
    // Refresh session age daily
    updateAge: 60 * 60 * 24,
  },
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

export async function hashPassword(password: string) {
  return betterAuthHashPassword(password);
}
