# Wave 0 production release QA

## Outcome

Wave 0 source is public, migration `0005_flexible_routine_topology` is applied and verified in production, and exact application commit `e44c1328bb566e1e2af5072f178648cefad736b5` is Ready on the stable production hostname. The public, password-authenticated, ownership, flexible-routine, workout, immutable-history, accessibility, cleanup, database-invariant, and real-Google gates pass. The error scan found one recoverable Neon WebSocket idle-listener process exit during the real-Google CSRF exchange; the immediately following session creation succeeded, and five direct endpoint replays returned `200`.

## Published source

- GitHub `main` is `e44c1328bb566e1e2af5072f178648cefad736b5`, advanced as a strict fast-forward from `d6228a03f15e4a181a33f96fe226f6c709cc9227`.
- Public branch `vishal/wave-0-integration` contains the approved application candidate and the public Corner Companions board, prompt, provenance, and decision packet.
- The selected concept packet contains no production companion CSS or component implementation.
- The dirty primary checkout remains at the old base because advancing it would overwrite pre-existing orchestrator planning changes.

## Recovery point

Before the schema write, the release created a private PostgreSQL custom-format archive through encrypted transport. The archive is 189,394 bytes and has SHA-256 `26a8b1a029003363ab3dc462774e3305ea2360e01bc396d4967acbdcdea44aa9`.

The archive restored into an isolated local PostgreSQL database after removing only PostgreSQL 18's unsupported `transaction_timeout` setting for the PostgreSQL 16 restore target. The restored database contained five migration records, 36 application tables, 200 constraints, 17 application triggers, 6 equipment rows, 27 catalog exercises, 54 curated videos, and no user or workout rows. No credential or user row was printed or committed.

## Production migration

The preflight confirmed five migration records, table owner and active role `neondb_owner`, zero duplicate program day keys, three active descendant immutability triggers, and no user, program, or workout rows.

Migration `drizzle/0005_flexible_routine_topology.sql` has SHA-256 `270adb8a10ec152412cf68b7545d784162a267e2345bb525986875ec4c13449c`. The designated table-owning role applied only this pending migration. Post-migration verification confirmed:

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

Git-connected preview `dpl_GFBoaoQ36SFP3ce1fefgCvcYCiyL` built the exact integration SHA and reached Ready. After migration verification, GitHub `main` advanced to the exact SHA. Production deployment `dpl_56XvQJJv4enVjRipeHf1USAZmQ5h` reached Ready and reports Git source `e44c1328bb566e1e2af5072f178648cefad736b5` from `main`. Vercel assigns the stable, project, and Git-main aliases to this deployment.

The first public matrix passed 46 cases, skipped the documented WebKit service-worker case, and timed out one WebKit phone guest journey while the newly deployed service-worker update notice intercepted the Push-day link. After alias convergence, the complete replay passed 47 cases with the same one documented skip. The matrix covered public discovery, account entry, seeded exercise details, serious and critical accessibility scans, responsive layouts, keyboard operation, dark mode, reduced motion, and supported Chromium offline behavior.

## Hosted authenticated verification

The bounded password-authentication suite passed in Chromium desktop. It verified registration, email action-code semantics, password recovery, secure production cookies, protected return handling, visible verified identity, sign-out, revocation handling, and cleanup. It made three expected first-party mutations. Firebase inventory returned to one pre-existing user.

The original ownership-suite failure report mislabeled onboarding as `alice_session`. Safe diagnostics proved that session creation, navigation, visible verified identity, and the secure cookie passed. Onboarding returned `201`; the next assertion still expected the pre-integration phrase `Dumbbells · five days` instead of the flexible summary `Revision 1 · Dumbbells · 5 days`.

After correcting only the verifier, the combined hosted replay passed with 19 expected first-party mutations and four foreign-or-missing probes. It verified:

- Separate session and onboarding failure stages.
- A custom one-day routine with an arbitrary name, one movement, and no cardio.
- Publication, reload, a second arbitrary day, one walker-cardio option, and stable opaque day routing.
- Start-or-resume conflict reuse of the same active session.
- A completed immutable snapshot and pre-edit history label.
- A new equipment revision with a changed revision ID and preserved topology keys.
- Foreign-owner and missing-resource equivalence with private `no-store` responses.
- Other-owner preservation, serious and critical accessibility scans, visible account deletion, and complete disposal of both synthetic identities.

## Rollback diagnosis

The release briefly promoted prior deployment `dpl_BCxN2q8qk5G1kNKkxNF2MzDLTqeB` while diagnosing the initially ambiguous ownership-suite result. The older application created a valid session but returned `500` from onboarding because it doesn't insert the non-null topology keys required by migration `0005`. The earlier claim that schema `0005` was forward-compatible with the old write path was incorrect.

The release re-promoted exact Wave 0 deployment `dpl_56XvQJJv4enVjRipeHf1USAZmQ5h`. No database rollback ran. After migration `0005`, a full rollback requires restoring the verified pre-migration recovery point with the older application; the old application alone isn't a safe rollback target.

## Final invariants and logs

After the passing replay, production contains six migration records, zero user profiles, zero user programs, zero program revisions, and zero workout sessions. Firebase contains the same one pre-existing user as before the run. The database contains 57 completed terminal account-deletion saga records. These bounded audit rows intentionally survive profile deletion and include the failed-before diagnostic identities; they aren't user fitness data.

The final Vercel scan found one `GET /api/auth/csrf` function exit at 10:38:56 PM US Central Daylight Time. The stack identifies an unhandled `@neondatabase/serverless` WebSocket idle event. The route itself has no database dependency. The following `POST /api/auth/session` succeeded at 10:38:57 PM, the browser reached `/app`, and five direct CSRF replays returned `200`. This event didn't block the release flow or alter data, but it remains a production resilience follow-up. The stable production hostname resolves to the Ready Wave 0 deployment.

## Real Google replay

The ordinary production **Continue with Google** action used the user's real provider session. The provider returned to bounded `/app`; the private onboarding surface displayed the account name, **Verified account**, saved-account navigation, and **Sign out**. Signing out returned to `/sign-in`. No profile or program was created for the provider identity.

The production password-authentication replay independently proved that malformed private and external `returnTo` values fall back to the safe application destination. Google wasn't simulated. After sign-out, Firebase still contained its one pre-existing user, and production retained zero user profiles, user programs, program revisions, and workout sessions.
