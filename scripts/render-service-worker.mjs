import { readFile, writeFile } from "node:fs/promises";

import { renderServiceWorker } from "../src/domain/pwa/cache-policy.ts";

const target = new URL("../public/sw.js", import.meta.url);
const output = renderServiceWorker();
const check = process.argv.includes("--check");

if (check) {
  const current = await readFile(target, "utf8").catch(() => "");
  if (current !== output) {
    console.error("public/sw.js is stale; run pnpm pwa:build.");
    process.exitCode = 1;
  } else {
    console.log("Verified generated service worker.");
  }
} else {
  await writeFile(target, output, "utf8");
  console.log("Rendered public/sw.js.");
}
