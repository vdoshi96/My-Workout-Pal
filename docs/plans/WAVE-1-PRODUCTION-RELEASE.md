# Wave 1 production release plan

## Outcome

Release application commit `a202a815ad3b7320bbc68b819303822ca4773b1d` after production migrations `0006_program_cardio_display_order` and `0007_personal_guidance` pass separate schema-owner transactions and post-migration verification. Keep a private, checksum-verified, restore-tested pre-`0006` archive. Preserve the three existing production aliases, Firebase providers, Neon resource, baseline users, and retained deletion audit records.

The deployed application source must remain the exact candidate commit. Store release documentation on `vishal/wave-1-production-release` so documentation closeout doesn't trigger a replacement application deployment from `main`.

## Completion

Completed on August 29, 2026. Production migrations `0006` and `0007`, public
and local `main`, Ready deployment `dpl_8Crg9j6UD9K3aH7r6icePmcvLzzH`, hosted
verification, data reconciliation, log review, and completed-source cleanup all
passed the gates below. The exact application remains
`a202a815ad3b7320bbc68b819303822ca4773b1d`; documentation-only closeout remains
on `vishal/wave-1-production-release`. See
`docs/qa/latest/WAVE-1-PRODUCTION-RELEASE-QA.md` for the authoritative result.

## Exact release identities

The release uses the following immutable inputs:

| Identity | Required value |
| --- | --- |
| Candidate commit | `a202a815ad3b7320bbc68b819303822ca4773b1d` |
| Candidate tree | `2f79527b017391aa7a49d2c48b96dd2e169ba784` |
| Candidate branch at intake | `origin/vishal/wave-1-integration` |
| Public `main` baseline | `4622f9e1b7783fd35cb6c23ae9396148c7c3357a` |
| `0006` SHA-256 | `e20555d7abccee6c620054bc62257b38dbaba2739ca5305e8daf6ca064eb56f5` |
| `0007` SHA-256 | `59dce2363f73c2c2a53ef9b4668d1ce57dbf575a8ef0759094ccb4c50eaea4e0` |
| Vercel project | `vdoshi96s-projects/my-workout-pal`, `prj_aHNqBtTx1irlbhNNvHTvynQkb0P9` |
| Firebase project | `my-workout-pal-92819` |
| Neon database and owner | `neondb`, `neondb_owner` |

Stop before any external write if a live identity differs from this table, if `main` no longer points to the baseline, or if the candidate is dirty, unpushed, or not a descendant of the baseline.

## Recorded preflight

The read-only preflight completed at `2026-08-29T17:29:36Z` with the following results:

- GitHub `main` and `origin/main` point to the exact baseline. The remote candidate and local release source point to the exact candidate. The baseline is the candidate's merge base, and the candidate worktree was clean.
- Vercel deployment `dpl_HAdDiwWwqRQbs8y8SM3TTwid529j` is Ready from exact baseline source on `main`. The stable, project, and Git-main aliases all point to that deployment. The project remains Next.js on Node.js 24.x in `iad1`.
- Vercel Production has the expected Neon and Firebase variable names. Every pullable required value matches the ignored local operator environment. `FIREBASE_PRIVATE_KEY` remains Sensitive and can't be pulled; the local credential passed a live Firebase Admin call instead.
- Firebase has Email/Password and Google enabled. The Google client ID and secret are configured. The production, Firebase-default, and localhost domains remain authorized. The client and server project IDs match. Firebase contains one pre-existing identity.
- Neon reports PostgreSQL 18.6, database `neondb`, schema `public`, session and current role `neondb_owner`, 12 MB used, and one read-only transaction. The `public` and `drizzle` objects are owned by `neondb_owner`.
- `drizzle.__drizzle_migrations` contains six records through exact `0005` hash `270adb8a10ec152412cf68b7545d784162a267e2345bb525986875ec4c13449c`. Neither Wave 1 schema shape exists.
- All inspected constraints are validated. Ten program and workout application triggers are enabled with state `O`, including `program_cardio_prescriptions_immutable_after_publish`.
- Starter counts are 6 equipment rows, 27 exercises, 44 compatibility rows, 54 aliases, 54 approved videos, 2 template revisions, 10 days, 26 sections, 60 prescriptions, and 20 template cardio rows.
- Owned-data counts are zero for profiles, programs, revisions, days, sections, prescriptions, cardio rows, custom exercises, custom videos, workout sessions, and workout snapshots. The database retains 57 completed account-deletion audit rows and one personal-record projection checkpoint.

The release must repeat the read-only Git, deployment, migration, trigger, and aggregate data checks immediately before the first schema write.

## Recovery point

Create the archive in `/Users/vishal/Library/Application Support/My Workout Pal/Backups/` with a UTC timestamp and `mwp-wave1-pre-0006-` prefix. Use PostgreSQL custom format over the configured unpooled TLS connection, set mode `600`, and calculate SHA-256. Don't commit, upload, or inspect private rows.

Restore the archive into a disposable local PostgreSQL database. If a server-version setting isn't accepted by the local restore target, remove only that setting from the archive workflow and record the compatibility adjustment. Verify the restored migration identities, schema-object totals, triggers, constraints, and privacy-safe row counts. Drop the disposable database after verification.

The archive and successful restore rehearsal are mandatory. Stop before migration if either result is incomplete, if available storage is insufficient, or if the archive permissions differ from `600`.

## Ordered schema release

Apply each migration with `psql` as `neondb_owner`, `ON_ERROR_STOP`, and one transaction. Record the matching Drizzle hash and journal timestamp in the same transaction as the schema change. Don't use the aggregate `db:migrate` command because it would apply both pending migrations without the required verification pause.

For `0006`, verify the following facts before continuing:

- The seventh migration record has the exact `0006` hash and timestamp.
- Every existing cardio row has non-null `display_order` from 1 through 2.
- Owner, revision, day, and order are unique.
- The order backfill is Walker, then Runner, with the documented ID tie-break.
- The order check and unique index are present, validated, and owned by `neondb_owner`.
- `program_cardio_prescriptions_immutable_after_publish` is enabled with state `O`.

For `0007`, verify the following facts before continuing:

- The eighth migration record has the exact `0007` hash and timestamp.
- The enum, table, columns, owner-scoped foreign keys, checks, partial unique indexes, and read indexes match the candidate.
- Legacy `custom_exercise_videos` rows map exactly once into personal guidance. Don't seed any of the 216 candidate links.
- Every guidance row has one owner-scoped source, one of two bounded positions, and a valid kind/URL shape.
- `workout_exercise_snapshots.guidance_snapshot` is non-null, bounded to two items, and preserves existing rows.
- Every `0006` invariant and the cardio immutability trigger remain intact.

Stop before application release if either transaction, migration identity, owner, trigger, constraint, index, backfill, or aggregate data invariant is uncertain. The migrations have no down path.

## Application release

After both schema gates pass, advance public `main` from the exact baseline to the exact candidate without a merge commit or replacement tree. Push only that commit. Update the primary local `main` only if the primary checkout is clean and can fast-forward safely.

Let Vercel build the Git-connected production deployment from exact `main`. Verify Ready state, Git source SHA, project, environment, existing aliases, security headers, public and private cache boundaries, and route inventory. Don't add an alias, change a provider, or modify project configuration.

## Hosted verification and cleanup

Replay the maintained public production matrix and the bounded hosted authentication suites. Then verify the Wave 1 member story with disposable production identities and owner-scoped data:

1. Verify safe password and Google returns, visible identity and verification state, sign-out, revocation handling, and cleanup.
2. Verify example and blank onboarding idempotency, arbitrary editor operations, the real chooser for add, replace, and seed-day, inline private movements, and guidance validation and replacement.
3. Verify publish, reload, exact saved-day start, zero-cardio, one-cardio, authored order, active-session conflict, immutable guidance/program/history snapshots, equipment revision, personal Home states, and owned Progress.
4. Verify missing and cross-owner resources fail safely without exposing ownership.
5. Verify `/progress`, the permanent `/sample-progress` redirect, one sample disclosure, service-worker caching, supported offline behavior, security headers, and private no-store behavior.
6. Reconcile database and Firebase counts, then remove only disposable identities and their owned rows. Preserve baseline identities and deletion audit records.
7. Scan the exact deployment's runtime, function, security, and error logs. Recheck the earlier idle Neon WebSocket and CSRF boundary after warming a database-backed route.

Retain only the production Wave 1 QA report, its HTML counterpart, and screenshots that materially prove the newest completed production run.

## Recovery decision

If migration verification fails before application release, stop traffic promotion and restore the database only after confirming the archive identity, target, and impact. Verify the restored migration table, schema objects, triggers, constraints, and counts before serving the baseline application.

If the application release fails after both migrations, don't promote a baseline application that can't write the Wave 1 schema safely. Prefer a compatible forward correction at the exact release source. Restore the database and baseline application together only when the reviewed recovery condition requires full pre-`0006` state.

## Closeout

Record the exact main and deployed SHA, deployment ID and URL, aliases, migration hashes, archive path/mode/hash/restore result, test and browser totals, provider results, database before/after invariants, logs, data cleanup, and remaining limitations. Push release evidence only to `vishal/wave-1-production-release` unless an application correction must enter `main`.

After successful hosted verification, remove clean completed Wave 1 source worktrees and their local branches when safe. Retain the unresolved `vishal/pre-wave1-primary-preservation` ref until its unique documentation content is reconciled. Don't delete remote provenance branches.
