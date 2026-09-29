import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return nextResolve("next/server.js", context);
  }

  if (specifier.startsWith("@/")) {
    const unresolved = path.join(root, specifier.slice(2));
    const candidates = [unresolved, `${unresolved}.ts`, `${unresolved}.tsx`, path.join(unresolved, "index.ts")];
    const resolved = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
    if (!resolved) throw new Error(`Unable to resolve application alias: ${specifier}`);
    return { url: pathToFileURL(resolved).href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
