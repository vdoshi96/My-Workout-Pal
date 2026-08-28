# Neon idle-pool resilience

## Outcome

Prevent an idle Neon WebSocket failure from becoming an uncaught exception that terminates a warm Vercel function. The database pool must consume and report idle-client errors without changing the result of the unrelated request that happens to be running when the event arrives.

This is an operational resilience correction. It does not change authentication, CSRF token generation, workout data, database structure, or product UI.

## Observed failure

The Wave 0 production deployment recorded one `GET /api/auth/csrf` response with status `200`, followed by a process exit with status `129`. The stack passed through the Neon pool's `idleListener` and Node's unhandled `error` event path. The CSRF route does not import or query the database; it was the next request handled by a warm process that still owned a shared pool created by an earlier database-backed request.

The installed Neon pool follows the Node event-emitter contract: an idle client error is re-emitted as a pool `error` event. Without a pool listener, Node treats that event as uncaught and terminates the process.

## Design

- Construct the Neon `Pool` explicitly in the database factory instead of asking Drizzle to construct it from a connection string.
- Attach exactly one pool `error` listener before exposing the pool to Drizzle.
- Keep the existing lazy singleton so importing a repository or auth route never creates a connection.
- Let the pool remove the failed idle client using its existing lifecycle. Do not retry an unknown operation or mutate application data in the listener.
- Emit one bounded diagnostic without the error object, connection string, query text, user identity, or request data. The message identifies an idle-pool failure and states that the client was discarded.
- Preserve the local loopback HTTP QA configuration and all existing database types.

## Application behavior

Navigation, route responses, loading states, responsive layouts, and accessibility semantics do not change. `/api/auth/csrf` remains database-independent and returns a no-store token response. Database-backed pages and mutations retain their current authorization and failure behavior.

## Types and persistence

`Database` remains a schema-typed Drizzle `NeonDatabase`. The underlying client remains a Neon `Pool`, now constructed explicitly. No schema, migration, snapshot, ownership, unit-conversion, or persistence contract changes.

## Authorization and privacy

Firebase UID ownership checks and CSRF validation remain unchanged. The resilience diagnostic must be constant text so production logs cannot expose database credentials, SQL, fitness data, authentication claims, or provider data.

## Failure recovery

An idle connection error causes Neon to remove that client. The pool remains available to create a replacement connection for later queries. Active query errors continue through the existing promise and route error paths; this listener does not turn failed database work into success. A failure in listener registration must be caught by tests and build-time type checking rather than deferred to production.

## Test-driven evidence

Fail first with a unit assertion that the database factory's pool has an `error` listener and can receive a synthetic idle error without throwing. Also assert that logging is bounded and excludes the supplied error message.

Then verify:

1. Focused database-client unit tests.
2. Existing database schema and route suites.
3. TypeScript and ESLint.
4. Full Vitest, documentation parity, and the Webpack production build.
5. A production-mode local browser replay covering CSRF retrieval and a database-backed authenticated flow.
6. Hosted deployment readiness, repeated direct CSRF responses, a database-backed warm-up followed by CSRF requests, and a bounded Vercel error-log scan.

## Acceptance criteria

- Every pool returned by `createDatabase` has one idle-error listener before use.
- A synthetic pool error does not throw or terminate the process.
- The diagnostic contains no raw error details.
- No database connection is created by importing the database module or serving the CSRF route.
- Existing query, transaction, authorization, and migration behavior remains green.
- Production serves the exact patched commit and the post-replay error scan contains no unhandled Neon pool error.

## Rollback

The source change is isolated to database-client construction and tests. If the patch causes a regression before deployment, revert it without touching migration `0005`. After deployment, application rollback is allowed only to a commit compatible with the already-applied schema; Wave 0 proved that pre-`0005` application code is not a safe standalone rollback target.
