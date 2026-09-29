export type BetterAuthSignupResult = {
  headers: Headers;
  response: { user: { id: string } };
};

type CompleteSignupOptions<T> = {
  signUp: () => Promise<BetterAuthSignupResult>;
  createProfile: (userId: string) => Promise<T>;
  rollbackAuthUser: (userId: string) => Promise<void>;
};

/**
 * Better Auth and the application profile transaction cannot share one Prisma
 * transaction. Compensate by deleting the Better Auth user on profile failure;
 * its account and session rows are cascade-deleted by the database.
 */
export async function completeSignup<T>({ signUp, createProfile, rollbackAuthUser }: CompleteSignupOptions<T>) {
  const signup = await signUp();

  try {
    const profile = await createProfile(signup.response.user.id);
    return { signup, profile };
  } catch (profileError) {
    try {
      await rollbackAuthUser(signup.response.user.id);
    } catch (rollbackError) {
      throw new AggregateError(
        [profileError, rollbackError],
        "Profile creation failed and the Better Auth account rollback also failed",
      );
    }
    throw profileError;
  }
}

export function appendSetCookieHeaders(source: Headers, target: Headers) {
  const cookies = source.getSetCookie();
  for (const cookie of cookies) target.append("set-cookie", cookie);
}
