import assert from "node:assert/strict";
import test from "node:test";

import { authPlugins, nextJsCookiePlugin } from "../lib/auth/nextjs-plugin.ts";

test("Better Auth installs the Next.js cookie propagation plugin as the final auth plugin", async () => {
  assert.equal(nextJsCookiePlugin.id, "next-cookies");
  assert.equal(authPlugins.at(-1)?.id, "next-cookies");
  assert.equal(nextJsCookiePlugin.hooks.after.length, 1);
  assert.equal(await nextJsCookiePlugin.hooks.after[0].matcher({} as never), true);
});
