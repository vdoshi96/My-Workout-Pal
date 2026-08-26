import { readFile } from "node:fs/promises";

const manifestPath = new URL("../.next/server/app-paths-manifest.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest)) {
  throw new Error("The production App Router manifest is malformed.");
}

const entries = Object.entries(manifest);
if (entries.length === 0) throw new Error("The production App Router manifest is empty.");

const forbidden = entries.filter(([route, output]) => {
  const value = typeof output === "string" ? output : "";
  return /harness|tests\/fixtures\/authenticated-app/i.test(`${route}\n${value}`);
});

if (forbidden.length > 0) {
  throw new Error("The production route manifest contains an authenticated harness route.");
}

console.log(`Production route boundary verified (${entries.length} App Router entries).`);
