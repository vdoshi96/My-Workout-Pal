# Wave 1 production release QA

## Status

The production release has passed intake, read-only environment preflight, private archive creation, and isolated restore rehearsal. No production schema or application release write has run at this checkpoint. Continue only through the ordered `0006`, `0007`, exact-`main`, exact-deployment, hosted-verification, and cleanup gates in `docs/plans/WAVE-1-PRODUCTION-RELEASE.md`.

## Release identity

| Role | Exact value |
| --- | --- |
| Candidate commit | `a202a815ad3b7320bbc68b819303822ca4773b1d` |
| Candidate tree | `2f79527b017391aa7a49d2c48b96dd2e169ba784` |
| Public `main` baseline | `4622f9e1b7783fd35cb6c23ae9396148c7c3357a` |
| Current production deployment | `dpl_HAdDiwWwqRQbs8y8SM3TTwid529j` |
| Vercel project | `vdoshi96s-projects/my-workout-pal`, `prj_aHNqBtTx1irlbhNNvHTvynQkb0P9` |
| Firebase project | `my-workout-pal-92819` |
| Neon database and owner | `neondb`, `neondb_owner` |
| `0006` SHA-256 | `e20555d7abccee6c620054bc62257b38dbaba2739ca5305e8daf6ca064eb56f5` |
| `0007` SHA-256 | `59dce2363f73c2c2a53ef9b4668d1ce57dbf575a8ef0759094ccb4c50eaea4e0` |

Live GitHub refs matched the required baseline and candidate. The local candidate was clean, had the required tree, and descended from the exact baseline. Vercel's stable, project, and Git-main production aliases all pointed to the Ready baseline deployment from exact Git source `4622f9e1b7783fd35cb6c23ae9396148c7c3357a`.

## Environment preflight

- Vercel remains linked to the expected Next.js project on Node.js 24.x in `iad1`. Required Neon and Firebase Production variables exist. Every pullable required value matched the ignored local operator environment. `FIREBASE_PRIVATE_KEY` remained Sensitive and returned only Vercel's placeholder.
- Firebase Admin access passed against `my-workout-pal-92819`. Email/Password and Google are enabled, the Google client credentials are configured, and the production, Firebase-default, and localhost domains are authorized. Firebase contained one pre-existing identity.
- Neon returned PostgreSQL 18.6, database `neondb`, schema `public`, and current/session role `neondb_owner` inside a read-only transaction. The database used 12 MB.
- `public` contained 35 tables and 140 indexes, and `drizzle.__drizzle_migrations` contained six exact records through `0005`. Every inspected constraint was validated, and all ten inspected program/workout triggers were enabled with state `O`.
- Wave 1 schema was absent: no cardio `display_order`, no personal-guidance enum or table, and no workout `guidance_snapshot`.
- Starter counts were 6 equipment rows, 27 exercises, 44 compatibility rows, 54 aliases, 54 approved videos, 2 template revisions, 10 days, 26 sections, 60 prescriptions, and 20 template cardio rows.
- Owned-data counts were zero for profiles, programs, revisions, days, sections, prescriptions, cardio rows, custom exercises, custom videos, workout sessions, and workout snapshots. The database retained 57 account-deletion audit rows and one personal-record projection checkpoint.

No identity provider, alias, project setting, paid configuration, or production data changed during preflight.

## Recovery archive

The release created the following private PostgreSQL custom-format archive over the configured unpooled TLS connection:

| Property | Result |
| --- | --- |
| Private path | `/Users/vishal/Library/Application Support/My Workout Pal/Backups/mwp-wave1-pre-0006-20260829T1735Z.dump` |
| File mode | `600` |
| Owner | `vishal:staff` |
| Size | 192,829 bytes |
| SHA-256 | `adcf511735677700332bb3afd884151f360a2da276c537f3e7ebf7fcf92b6ac5` |
| Archive entries | 320 |

The archive isn't committed or uploaded. No private row or credential entered output or documentation.

## Restore rehearsal

PostgreSQL 18.6 `pg_restore` rendered the custom archive into a private temporary SQL stream. The local PostgreSQL 16.15 target doesn't support PostgreSQL 18's `transaction_timeout` setting, so the rehearsal removed exactly that one `SET transaction_timeout = 0;` line from the temporary stream. No schema or data statement changed.

The isolated restore reproduced the following privacy-safe state:

- Six migration records from timestamp `1787688103412` through `1787867429188`, with exact `0005` hash `270adb8a10ec152412cf68b7545d784162a267e2345bb525986875ec4c13449c`.
- 35 public tables, 140 public indexes, 200 validated constraints, zero invalid or unvalidated constraints, and 17 application triggers all enabled with state `O`.
- Every starter, owned-data, deletion-audit, and projection-checkpoint aggregate from production preflight.
- No Wave 1 schema shape.
- Archive checksum `adcf511735677700332bb3afd884151f360a2da276c537f3e7ebf7fcf92b6ac5` unchanged after the restore.

The disposable database, cluster, socket, log, and temporary SQL stream were deleted after verification. The private custom archive remains the restore-gated recovery point.

## Next release gate

Repeat the live read-only Git, Vercel, Firebase, Neon migration, trigger, constraint, and aggregate checks. If they match, apply only `0006` in one schema-owner transaction, record its exact Drizzle identity in that transaction, and verify every `0006` invariant before applying `0007`.
