import process from "node:process";

import { createDatabase } from "../src/db/client.ts";
import { verifyStarterDatabase } from "../src/db/starter-seed.ts";

async function main(): Promise<void> {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("db:verify requires DATABASE_URL; no database was queried.");
  }
  const result = await verifyStarterDatabase(createDatabase());
  console.log(`db:verify passed: ${JSON.stringify(result)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "db:verify failed safely.");
  process.exitCode = 1;
});
