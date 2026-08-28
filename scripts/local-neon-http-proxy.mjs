import { createServer } from "node:http";

import pg from "pg";

const { Pool } = pg;
const port = Number(process.env["MWP_LOCAL_NEON_PROXY_PORT"]);
if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
  throw new Error("MWP_LOCAL_NEON_PROXY_PORT must be an unprivileged loopback port");
}
const postgresPort = Number(process.env["MWP_LOCAL_POSTGRES_PORT"]);
if (!Number.isInteger(postgresPort) || postgresPort < 1024 || postgresPort > 65_535) {
  throw new Error("MWP_LOCAL_POSTGRES_PORT must be an unprivileged loopback port");
}

const loopbackHosts = new Set(["127.0.0.1", "[::1]", "localhost"]);
const isolationLevels = new Set([
  "ReadUncommitted",
  "ReadCommitted",
  "RepeatableRead",
  "Serializable",
]);
const pools = new Map();
const rawTextTypes = { getTypeParser: () => (value) => value };

function validatedConnectionString(request) {
  const value = request.headers["neon-connection-string"];
  if (typeof value !== "string") throw new Error("The Neon connection header is required");
  const parsed = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !loopbackHosts.has(parsed.hostname)
  ) {
    throw new Error("The local Neon QA proxy accepts loopback PostgreSQL connections only");
  }
  return value;
}

function poolFor(connectionString) {
  let pool = pools.get(connectionString);
  if (!pool) {
    const parsed = new URL(connectionString);
    process.stdout.write(
      `Opening local PostgreSQL ${parsed.hostname}:${postgresPort}${parsed.pathname}\n`,
    );
    pool = new Pool({
      database: decodeURIComponent(parsed.pathname.slice(1)),
      host: parsed.hostname,
      max: 8,
      password: decodeURIComponent(parsed.password),
      port: postgresPort,
      user: decodeURIComponent(parsed.username),
    });
    pools.set(connectionString, pool);
  }
  return pool;
}

function resultPayload(result) {
  return {
    command: result.command,
    fields: result.fields.map(({ dataTypeID, name }) => ({ dataTypeID, name })),
    rowCount: result.rowCount,
    rows: result.rows,
  };
}

async function execute(client, statement) {
  if (
    !statement ||
    typeof statement.query !== "string" ||
    !Array.isArray(statement.params)
  ) {
    throw new Error("The Neon query payload is malformed");
  }
  const result = await client.query({
    rowMode: "array",
    text: statement.query,
    types: rawTextTypes,
    values: statement.params,
  });
  return resultPayload(result);
}

async function executePayload(pool, payload, headers) {
  if (Array.isArray(payload?.queries)) {
    const client = await pool.connect();
    try {
      const isolation = headers["neon-batch-isolation-level"];
      const readOnly = headers["neon-batch-read-only"];
      const deferrable = headers["neon-batch-deferrable"];
      if (typeof isolation === "string" && !isolationLevels.has(isolation)) {
        throw new Error("The Neon batch isolation level is invalid");
      }
      const isolationSql = typeof isolation === "string"
        ? isolation.replace(/([a-z])([A-Z])/gu, "$1 $2").toUpperCase()
        : "";
      const transactionOptions = [
        isolationSql ? `ISOLATION LEVEL ${isolationSql}` : "",
        readOnly === "true" ? "READ ONLY" : readOnly === "false" ? "READ WRITE" : "",
        deferrable === "true" ? "DEFERRABLE" : deferrable === "false" ? "NOT DEFERRABLE" : "",
      ].filter(Boolean).join(" ");
      await client.query(`BEGIN${transactionOptions ? ` ${transactionOptions}` : ""}`);
      const results = [];
      for (const statement of payload.queries) results.push(await execute(client, statement));
      await client.query("COMMIT");
      return { results };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
  return execute(pool, payload);
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/sql") {
    response.writeHead(404).end("Not found");
    return;
  }

  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) throw new Error("The Neon query payload is too large");
      chunks.push(chunk);
    }
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const connectionString = validatedConnectionString(request);
    const result = await executePayload(poolFor(connectionString), payload, request.headers);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "The local Neon query failed";
    response.writeHead(400, { "content-type": "application/json" });
    response.end(JSON.stringify({ message }));
  }
});

async function close() {
  await Promise.all([...pools.values()].map((pool) => pool.end()));
  server.close();
}

process.once("SIGINT", close);
process.once("SIGTERM", close);
server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Local Neon HTTP QA proxy ready on 127.0.0.1:${port}\n`);
});
