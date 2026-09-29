import { APIError } from "better-auth";

const duplicateUserCodes = new Set(["USER_ALREADY_EXISTS", "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"]);

export function isBetterAuthDuplicateUserError(error: unknown) {
  return error instanceof APIError && duplicateUserCodes.has(error.body?.code ?? "");
}

export function getBetterAuthSignupConflictStatus(error: unknown) {
  return isBetterAuthDuplicateUserError(error) ? 409 : null;
}
