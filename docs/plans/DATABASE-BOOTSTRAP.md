# Database bootstrap plan

## User outcome

Guests and signed-in users see the same canonical exercise catalog and the same two five-day starter-program variants on every environment. Operators can migrate, seed, and verify an empty or previously seeded database without inventing video approvals, changing published history, or silently accepting drift.

## Entry points and navigation

This is an operator workflow rather than a page. `db:migrate` applies checked-in migrations, `db:seed` inserts or verifies the deterministic starter graph, and `db:verify` performs a read-only publication check. Application routes consume published revisions only; no bootstrap command changes navigation or creates a user program.

## States and recovery

- **Empty:** migration creates the bounded schema; seeding writes catalog rows and each template revision as a draft, writes all children, then publishes it.
- **Already current:** rerunning seeding performs no material update and verification reports the same identities and counts.
- **Catalog drift:** a conflicting deterministic row aborts the transaction with the table and identity named; existing data stays intact.
- **Published-template drift:** immutable published rows are never rewritten. Any mismatch or missing child is an error with a fresh migration or revision required.
- **Interrupted:** migration bookkeeping and each seed transaction are atomic. A retry starts from the last committed boundary.
- **Missing credentials:** commands fail before network mutation with a concise `DATABASE_URL` gate.
- **Worst case:** constraint, connection, or transaction failure exits nonzero, prints no secret, and publishes nothing partially.

## Domain types and invariants

The canonical domain manifest produces stable RFC 4122 version 5 identifiers for exercises, aliases, templates, revisions, days, sections, prescriptions, and cardio choices. There are six equipment records, 27 exercises, two profile revisions, ten days, 26 sections, 60 exercise prescriptions, 20 cardio prescriptions, and 54 approved video rows. Every foreign key resolves inside the planned graph. Prescription labels may specialize presentation, such as “Heavy goblet squat,” without duplicating the catalog exercise. The video rows derive from the checked-in schema-one manifest only after every required variation has exactly two eligible, scoped-embed-verified, fully watched approvals. Review timestamps are normalized to canonical ISO milliseconds before deterministic database comparison.

## Persistence, authentication, and authorization

Bootstrap uses the server-only Neon connection and a single database transaction for the starter graph. It does not accept a Firebase UID, create user-owned rows, or bypass ownership constraints. Runtime readers select `published` template revisions. Historical workout snapshots remain independent of future catalog or template publication.

## Responsive behavior and accessibility

No user interface is introduced. Any later operator surface must expose the same explicit state labels and keyboard-readable error text; it must never render a successful seed state from local fixture data.

## Privacy and security

The connection string stays in environment variables and is never logged. Errors identify logical table/key boundaries, not credentials or raw driver configuration. Private reference media, curation reports, and unapproved video candidates are outside the seed. Commands make no cross-user queries or writes.

## Acceptance criteria

- Migration succeeds from an empty PostgreSQL database and is tracked once.
- Seeding succeeds from empty schema, then a second run is materially idempotent.
- Published revisions contain the exact planned children and publication timestamp.
- A deliberately changed deterministic catalog row is rejected and rolled back.
- A deliberately changed or missing published child is rejected rather than repaired in place.
- Verification reports expected counts, relationship coverage, 54 approved videos, and no secret values.
- The production Neon database passes migrate, seed, rerun, and read-only verification before an application deployment is called database-ready.

## Automated tests and evidence

PGlite integration tests apply the real SQL migration, demonstrate the initial failure before the seeder exists, seed an empty database, rerun it, inspect exact counts and publication states, and prove catalog and published-child drift roll back. Typecheck, lint, migration metadata validation, documentation parity, and a production build remain required. Deployment evidence records sanitized command outcomes and read-only row counts; local success is not production proof.
