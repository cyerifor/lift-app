import { spawnSync } from "node:child_process";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  console.error("TEST_DATABASE_URL is required for the PostgreSQL M1 verification gate.");
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DIRECT_URL: databaseUrl,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "postgres-test-secret-at-least-32-characters",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
};

function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"]);
run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "status"]);
run(process.execPath, [
  "--import",
  "tsx",
  "--test",
  "tests/integration/auth-postgres.test.ts",
  "tests/exercise-api-postgres.integration.ts",
  "tests/exercise-postgres.integration.ts",
]);
