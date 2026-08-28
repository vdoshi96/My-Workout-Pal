# Wave 0 production release QA

## Outcome

Wave 0 source is public, migration `0005_flexible_routine_topology` is applied and verified in production, and the application deployment was rolled back after a repeated authenticated release-gate failure. Production serves the prior verified application deployment. No database rollback was required.

## Published source

- Public integration branch: `vishal/wave-0-integration`, containing application candidate `e44c1328bb566e1e2af5072f178648cefad736b5` followed only by the blocked-release evidence commit.
- GitHub `main`: `e44c1328bb566e1e2af5072f178648cefad736b5`, advanced as a strict fast-forward from `d6228a03f15e4a181a33f96fe226f6c709cc9227`.
- The selected Corner Companions board, prompt, provenance, and decision packet are public. The release contains no production companion CSS or component implementation.
- The dirty primary checkout remains at the old base because advancing it would overwrite pre-existing orchestrator planning changes.

## Recovery point

Before the schema write, a private PostgreSQL custom-format recovery archive was created through encrypted transport. The archive was 189,394 bytes, contained 314 entries, and had SHA-256 `26a8b1a029003363ab3dc462774e3305ea2360e01bc396d4967acbdcdea44aa9`.

The archive restored into an isolated local PostgreSQL database after removing only PostgreSQL 18's unsupported `transaction_timeout` setting for the PostgreSQL 16 restore target. The restored database contained five migration records, 36 application tables, 200 constraints, 17 application triggers, 6 equipment rows, 27 catalog exercises, 54 curated videos, and no user or workout rows. No credential or user row was printed or committed.

## Production migration

The preflight confirmed `origin/main` at the approved base, five production migration records, table owner and active role `neondb_owner`, zero duplicate program day keys, three active descendant immutability triggers, and no user, program, or workout rows.

Migration `drizzle/0005_flexible_routine_topology.sql` has SHA-256 `270adb8a10ec152412cf68b7545d784162a267e2345bb525986875ec4c13449c`. The designated table-owning role applied only the pending migration. Post-migration verification confirmed:

- Six migration records with the exact `0005` hash as the newest record.
- Non-null `section_key`, `prescription_key`, and `cardio_key` columns.
- Four owner-and-revision-scoped unique indexes.
- The `day_number` constraint bounded from 1 through 14.
- All three immutability triggers enabled.
- Zero failed backfills.
- Existing owner-scoped foreign keys and constraints retained.
- Starter counts unchanged at 6 equipment rows, 27 exercises, 44 compatibility edges, 54 aliases, 2 revisions, 10 days, 26 sections, 60 prescriptions, 20 cardio prescriptions, and 54 approved videos.
- An immediate migration replay reported the checked-in migrations as current.

No seed, delete, history rewrite, or production data repair ran.

## Deployment and public verification

Git-connected preview `dpl_GFBoaoQ36SFP3ce1fefgCvcYCiyL` built the exact integration SHA and reached Ready. After the migration verification, GitHub `main` advanced to the exact SHA. Vercel production deployment `dpl_56XvQJJv4enVjRipeHf1USAZmQ5h` reached Ready and reported Git source `e44c1328bb566e1e2af5072f178648cefad736b5` from `main`.

The first public matrix passed 46 cases, skipped the documented WebKit service-worker case, and timed out one WebKit phone guest journey while the newly deployed service-worker update notice intercepted the Push-day link. After alias convergence, the single permitted complete replay passed 47 cases with the same one documented skip. The matrix covered public discovery, account entry, seeded exercise details, serious and critical accessibility scans, responsive layouts, keyboard operation, dark mode, reduced motion, and supported Chromium offline behavior.

## Authenticated verification and stop boundary

The bounded hosted authentication suite passed in Chromium desktop. It verified registration, email action-code semantics, password recovery, secure production cookies, protected return, visible verified identity, sign-out, revocation handling, and cleanup. It made three expected first-party mutations. Firebase inventory returned to one pre-existing user.

The two-owner deletion and IDOR suite failed twice at `alice_session`. Both attempts created two verified disposable identities, stopped before owner data setup or foreign-owner probes, and confirmed cleanup. The exact Wave 0 deployment had zero bounded Vercel error-log entries and no HTTP 500 entry, but the client did not complete the suite's expected post-session navigation. Verification stopped at that first repeated boundary.

Because the ownership suite did not cross its first account boundary, the hosted flexible-routine publication story, foreign-owner probes, immutable history story, and real Google sign-in were not claimed. Local combined evidence for those behaviors remains valid only for the exact local candidate and fixture.

## Rollback and invariants

Vercel rolled the production alias back to `dpl_BCxN2q8qk5G1kNKkxNF2MzDLTqeB`, source `a353067558323cc21361fa1919507ee890c0f983`. The rollback target is Ready and the stable production hostname returns `200` with the expected CSP, HSTS, frame denial, referrer policy, and private no-store HTML response. Bounded error-log queries returned zero entries for both the failed Wave 0 deployment and the rollback target.

Post-cleanup verification found one pre-existing Firebase user, zero user profiles, zero user programs, zero program revisions, zero workout sessions, 40 pre-existing terminal account-deletion job records, and six migration records. The migration remains forward-compatible with the rollback application. No rollback of production data was needed.

## Remaining gate

Before another Wave 0 application release, reproduce the `alice_session` navigation failure with safe client diagnostics, correct it on a separately reviewed commit, and repeat the complete public, authenticated, ownership, flexible-routine, database-invariant, log, and real-Google matrices. Do not treat the successful password suite or local fixture as real-Google proof.
