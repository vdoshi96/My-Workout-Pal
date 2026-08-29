# Wave 1 production release plan and record

## Outcome

Wave 1 was released on August 29, 2026. Production migrations
`0006_program_cardio_display_order` and `0007_personal_guidance` passed separate
schema-owner transactions and post-migration verification before application
commit `a202a815ad3b7320bbc68b819303822ca4773b1d` advanced to public `main` and
Vercel production. A private, checksum-verified pre-`0006` archive passed an
isolated restore rehearsal first.

The application, local and public `main`, and production source remain the exact
application commit. Release documentation is retained separately on
`origin/vishal/wave-1-production-release` so the documentation closeout does not
trigger a replacement deployment from `main`.

## Exact identities

| Identity | Verified value |
| --- | --- |
| Application and `main` commit | `a202a815ad3b7320bbc68b819303822ca4773b1d` |
| Application tree | `2f79527b017391aa7a49d2c48b96dd2e169ba784` |
| Previous `main` baseline | `4622f9e1b7783fd35cb6c23ae9396148c7c3357a` |
| Production deployment | `dpl_8Crg9j6UD9K3aH7r6icePmcvLzzH` |
| `0006` SHA-256 | `e20555d7abccee6c620054bc62257b38dbaba2739ca5305e8daf6ca064eb56f5` |
| `0007` SHA-256 | `59dce2363f73c2c2a53ef9b4668d1ce57dbf575a8ef0759094ccb4c50eaea4e0` |
| Production evidence commit | `b364d1987a8190a6d8bb92e7a8d7a64f077c0843` |

The Ready deployment retained the stable, project, and Git-main production
aliases, Node.js 24.x, region `iad1`, the existing Firebase providers, and the
existing Neon resource.

## Recovery gate

Before migration, the schema owner created a private mode-`600` PostgreSQL
custom-format archive outside the repository and verified its checksum. An
isolated local restore reproduced the exact six pre-Wave-1 migration identities,
schema objects, triggers, constraints, privacy-safe starter aggregates, zero
owned rows, retained deletion audits, and the projection checkpoint. The
disposable restore environment was removed and the archive was not uploaded.

Rollback remains restore-gated because neither Wave 1 migration has a checked-in
down path. No production restore was necessary or attempted.

## Ordered schema release

Migration `0006` ran first in one explicit `neondb_owner` transaction. Its gate
verified deterministic cardio-order backfill, non-null one-to-two order,
owner/revision/day/order uniqueness, validated constraints, expected ownership,
and the enabled cardio immutability trigger.

The first `0007` verification attempt rolled back safely because its gate did
not account for PostgreSQL identifier truncation. Post-rollback checks proved
that `0006` remained intact and no `0007` object or data remained. The unchanged
`0007` migration then passed the corrected structural gate in a new transaction.
Final verification found 36 public tables, 148 public indexes, zero invalid
constraints, zero disabled user triggers, and enabled cardio immutability.

## Application and hosted verification

Vercel built the Git-connected deployment only after both schema gates passed.
The exact application candidate had already passed TypeScript, ESLint, 118
Vitest files and 814 tests, four database files and 34 tests, Drizzle metadata,
the exact-two approved-video seed check, PWA generation, 50-document parity, the
production build, and the 44-route boundary.

Hosted verification passed the maintained public matrix, all unique runnable
authenticated fixture cases, password verification/recovery and revocation,
real Google return, reauthentication, revocation and sign-out, owner-isolation
and deletion, reviewed media, native 200% zoom, and the complete Wave 1 editor,
guidance, cardio, runner, history, Home, Progress, conflict, and equipment-
revision story.

## Data and provider reconciliation

Every disposable Firebase identity and owned application row was removed.
Production returned to one baseline Google identity and zero owned profiles,
programs, workout sessions, guidance links, idempotency rows, records, and
progress rows. All 70 retained deletion audits were terminal and completed.
The released 27 catalog exercises and 54 already-approved video rows remained
unchanged. The 216 candidate guidance links were not seeded, no provider or
alias changed, and no private recovery contents were published.

## Evidence retention and later branch reconciliation

The full production QA report and its six hosted screenshots remain available
at exact commit `b364d1987a8190a6d8bb92e7a8d7a64f077c0843` on
`origin/vishal/wave-1-production-release` and in Git history. They are not copied
into `docs/qa/latest/`, which retains only the newer Wave 2 integration report,
its HTML counterpart, and six current Wave 2 screenshots.

Clean completed Wave 1 source worktrees and local branches were removed after
ancestry verification; remote provenance branches remain. Later live review
confirmed that `vishal/pre-wave1-primary-preservation` exists neither locally
nor on `origin`. Its unique pre-sync state is preserved outside the repository
in the private mode-`600` bundle
`/Users/vishal/Library/Application Support/My Workout Pal/Backups/mwp-pre-wave1-preservation-4ad6dff.bundle`.

This record does not authorize a replacement production deployment, another
migration, a provider change, or candidate-video approval or seeding.
