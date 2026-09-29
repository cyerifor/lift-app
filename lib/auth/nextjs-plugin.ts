import { nextCookies } from "better-auth/next-js";

// Keep this plugin last: it writes Better Auth response cookies, including
// refreshed session cookies, through Next.js's request-scoped cookie store.
export const nextJsCookiePlugin = nextCookies();
export const authPlugins = [nextJsCookiePlugin];
