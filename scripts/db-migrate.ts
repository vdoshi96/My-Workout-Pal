import process from "node:process";

import { migrate } from "drizzle-orm/neon-serverless/migrator";

import { createDatabase } from "../src/db/client.ts";

async function main(): Promise<void> {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("db:migrate requires DATABASE_URL; no database was changed.");
  }
  await migrate(createDatabase(), { migrationsFolder: "drizzle" });
  console.log("db:migrate passed: checked-in migrations are current.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "db:migrate failed safely.");
  process.exitCode = 1;
});
