# First-principles simplification

## Outcome and scope

Help a person plan, log, resume, and review training with truthful save state.
Remove code that has no application caller before introducing abstractions or
automation. Keep ownership enforcement, immutable snapshots, offline recovery,
video review, and the approved visual system: each serves a documented need.

Delete the unused double-progression evaluator and its isolated tests. It has
no application caller, so retaining it overstates the delivered product and
maintains speculative behavior. Delete the unused runner barrel and 13 unused
runner aliases; retain the snapshot alias used by the workout repository.

## History behavior

An interrupted workout can legitimately contain unfinished exercises, with or
without saved sets. Remove the requirement to complete or skip every exercise
before reading an abandoned session. Preserve pending state in the read model
and display it as **unfinished** in the existing read-only History detail.
Completed sessions with pending exercises and snapshots with missing state
remain conflicts. Do not invent skips, completion, sets, or measurements.

Navigation, responsive layout, semantics, units, and persistence stay with the
existing History components and repositories. No migration, backfill, new
route, input, client state, or recovery workflow is needed. The owner comes
from the verified server viewer. Existing not-found behavior hides foreign
sessions. Failed reads retain the existing error boundary.

## Acceptance and verification

- Prove start, optional set logging, abandon, and History read through the real
  repository against local PostgreSQL-compatible PGlite migrations. Assert
  preserved pending states, saved measurements, repeated reads, and foreign
  resource denial. Retain the failure before changing the repository.
- Check that completed sessions with pending exercises and missing exercise
  state still fail closed.
- Render unfinished movements with and without logs, preserving read-only copy.
- Check imports, TypeScript, lint, the full tests, schema, seed policy, PWA,
  production build and boundary, and generated documentation parity.
- Replay the interrupted History flow in a local authenticated browser fixture
  using the real repository and component. Inspect phone and desktop layout.
  Local proof does not establish hosted production behavior.

## Closeout

Use the feature branch, push and merge into main after verification, and sync
local main. The canonical checkout is the only worktree. Correct delivered
capability claims and link the verification record. Preserve dated release
history; retain only the newest completed QA evidence under docs/qa/latest.
