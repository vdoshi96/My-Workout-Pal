import process from "node:process";

import { createDatabase } from "../src/db/client.ts";
import { seedStarterDatabase } from "../src/db/starter-seed.ts";

async function main(): Promise<void> {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("db:seed requires DATABASE_URL; no database was changed.");
  }
  const result = await seedStarterDatabase(createDatabase());
  console.log(`db:seed passed: ${JSON.stringify(result)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "db:seed failed safely.");
  process.exitCode = 1;
});
