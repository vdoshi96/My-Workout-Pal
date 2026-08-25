import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema, type DatabaseSchema } from "@/db/schema";

export type Database = NeonDatabase<DatabaseSchema>;

/**
 * Build a Neon-backed Drizzle client only when a caller explicitly asks for one.
 * Importing repositories, Server Components, tests, or Drizzle config does not
 * require credentials and never opens a network connection.
 */
export function createDatabase(connectionString = process.env["DATABASE_URL"]): Database {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to connect to Postgres");
  }

  return drizzle(connectionString, { schema });
}

let database: Database | undefined;

export function getDatabase(): Database {
  return (database ??= createDatabase());
}
