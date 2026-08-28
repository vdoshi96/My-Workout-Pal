import { neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";

import { schema, type DatabaseSchema } from "@/db/schema";

export type Database = NeonDatabase<DatabaseSchema>;

type LocalQaEnvironment = Readonly<Record<string, string | undefined>>;

export function resolveLocalQaFetchEndpoint(
  environment: LocalQaEnvironment,
): string | undefined {
  const endpoint = environment["MWP_LOCAL_NEON_HTTP_ENDPOINT"];
  if (!endpoint) return undefined;
  if (environment["MWP_LOCAL_DATABASE_QA"] !== "1") {
    throw new Error("MWP_LOCAL_NEON_HTTP_ENDPOINT requires MWP_LOCAL_DATABASE_QA=1");
  }

  const parsed = new URL(endpoint);
  const loopbackHosts = new Set(["127.0.0.1", "[::1]", "localhost"]);
  if (
    parsed.protocol !== "http:" ||
    !loopbackHosts.has(parsed.hostname) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("The local Neon QA endpoint must be an uncredentialed loopback HTTP URL");
  }
  return parsed.toString();
}

function configureLocalQaFetchEndpoint(): void {
  const endpoint = resolveLocalQaFetchEndpoint(process.env);
  if (!endpoint) return;
  neonConfig.poolQueryViaFetch = true;
  neonConfig.fetchEndpoint = endpoint;
}

configureLocalQaFetchEndpoint();

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
