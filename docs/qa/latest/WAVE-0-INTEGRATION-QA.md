# Wave 0 integration QA

## Candidate boundary

The local `vishal/wave-0-integration` branch combines the following exact inputs on clean base `d6228a03f15e4a181a33f96fe226f6c709cc9227`:

- Authentication entry handoff: `871fb4ace20bd5b780c5dc4fd8014ede9a352bb6`, including implementation `8dc093a7e419cce57e6b164d42f2c17aaad8e686`.
- Flexible routine publication: `452c8a41f5d375862e67999f2cbfa39a5fee41da`.
- Corner Companions selection: `acfc4e60013c46da294fe62bb1cfe0a85cb5839f`.

This candidate is local only. Nothing was pushed, merged to `main`, migrated in production, deployed, promoted, or aliased. The Corner Companions assets and decision packet remain private and local. No production companion CSS or component implementation is included.

## Conflict resolution

The authentication and flexible-routine merges applied without manual conflicts. Git merged their shared `src/app/globals.css` and authenticated geometry test changes automatically.

The Corner Companions merge conflicted only in shared documentation:

- `docs/context/DECISIONS.md` retains the flexible-routine and authentication decisions and adds the completed Corner Companions selection and rollout guardrails.
- `docs/context/STATUS.md` reports the combined local integration state instead of either branch's stale preimplementation wording.
- `docs/design/DIRECTION.md` points to the selected Corner Companions packet and keeps production porting behind the Wave 3 pilot.
- `docs/plans/WORKOUT-COMPANION-REPOSITIONING.md` retains the completed selection, discarded-alternative record, private-publication boundary, and later-wave dependencies.
- `docs/wiki/index.md` retains the combined project map.
- Generated HTML counterparts were regenerated from the reconciled Markdown sources.

## Migration confirmation

The clean base contained migrations `0000` through `0004`. The integrated tree contains exactly one `0005` migration: `drizzle/0005_flexible_routine_topology.sql`. The Drizzle journal records the matching `0005_flexible_routine_topology` tag, and `drizzle/meta/0005_snapshot.json` is the only `0005` snapshot.

The complete Vitest suite exercises the PGlite migration chain through `0005`, including the dedicated flexible-topology migration tests, repository tests, ownership constraints, immutable snapshots, publication rules, and starter compatibility.

## Verification results

The following local checks passed on the combined source after the integration fix:

- `git diff --check` against the clean base.
- Strict TypeScript.
- Full ESLint.
- Full Vitest: 106 files and 729 tests.
- Drizzle metadata and selected schema/bootstrap checks: four files and 34 tests.
- Exact-two approved-video seed validation: 27 required variations.
- Generated service-worker parity.
- Generated documentation parity: 45 retained Markdown and HTML pairs after the integrated report replaced both branch-specific QA pairs.
- Next.js 16.3.2 production Webpack build.
- Production route boundary: 41 App Router entries.
- Authenticated production-mode fixture: 34 passes and two intentional engine-scoped skips across Chromium desktop, WebKit phone, Chromium phone, Chromium tablet, WebKit tablet, and WebKit desktop.

The authenticated fixture passed the combined ordinary member entry and identity shell, verified and unverified states, foreign-owner safety, arbitrary routine creation and publication, stable opaque day routing, zero-cardio and one-cardio days, accepted-then-error publication recovery, start and resume behavior, active-session conflict, immutable workout and history snapshots, metric and imperial presentation, equipment-revision topology, interrupted runner recovery, session-expired and session-revoked returns, multi-tab conflict resolution, and durable completion.

## Integration defect and red-green evidence

The first authenticated combined run passed 32 cases, skipped two intentional project-specific cases, and timed out the same legacy customization journey on Chromium desktop and WebKit phone. The failure waited for the removed fixed DOM ID `cardio-push-walker`. After the first correction, flexible day controls also exposed broad `Pull` and `Power Push` selectors that matched day actions as well as the day selector.

The fix scopes cardio inputs to the semantic optional-cardio fieldset and its `walker` heading, and scopes day selection to the accessible name suffix that ends in the movement count. The focused failed-before journey then passed on Chromium desktop and WebKit phone in 40 seconds. The complete authenticated matrix subsequently passed 34 cases with the same two intentional engine-scoped skips.

## Public production-mode matrix gate

The credential-free public matrix passed 39 cases, recorded the expected WebKit service-worker capability skip, and failed eight exercise-detail-dependent cases because this isolated worktree has no `DATABASE_URL`. Each failure stopped at the truthful server error `DATABASE_URL is required to connect to Postgres`; account-entry, public navigation, accessibility, responsive, keyboard, reduced-motion, dark-mode, and supported offline cases passed.

The primary checkout has an ignored secret-bearing environment, but this task didn't load it because doing so could connect the local server to remote services. A task-owned native PostgreSQL cluster was also tested as a safer alternative. The native connection succeeded, but the application intentionally uses Neon's HTTP serverless transport, so a plain PostgreSQL socket can't satisfy the runtime route without adding an out-of-scope proxy or changing production database code. The temporary cluster and log were stopped and removed.

To close this local gate, provide a credential-isolated Neon-compatible read-only database environment containing migrations `0000` through `0005` and the deterministic approved-video seed, or separately authorize read-only use of the existing ignored environment. Rerun the complete public matrix and require 47 passes with the single documented WebKit service-worker skip before release approval. Do not report the eight cases as application failures or as passes until that replay succeeds.

## Hosted Google gate

Local and synthetic fixtures don't prove real Google provider behavior. After a separately authorized preview or production candidate exists, start from the ordinary public account action, complete real Google sign-in, confirm the secure server session returns to the bounded private target, verify visible identity and sign out, and test a malicious or malformed `returnTo` fallback. Don't simulate Google authentication.

## Release order and stop gates

If the user separately authorizes production release, use this order:

1. Confirm the exact approved release commit and clean schema-owner environment.
2. Establish the approved Neon recovery point.
3. Run a read-only production preflight.
4. Apply `0005_flexible_routine_topology` through the designated schema owner.
5. Verify the journal, schema, constraints, existing rows, deterministic seed, and migration replay.
6. Deploy the application commit that requires `0005`.
7. Replay the public matrix, authenticated matrix, real Google entry, foreign-owner checks, and exact-deployment error logs.
8. Promote or alias only after every check passes.

Never deploy the application before the schema-owner migration succeeds and its verification passes. Publishing the Corner Companions board, prompt, provenance, decision packet, or integration branch to the public repository requires separate user authorization. Production companion implementation also requires the later Wave 3 pilot authorization and evidence.

## Retained evidence

The newest integrated evidence set consists of this report and the following screenshots:

- `firebase-client-auth-missing-chromium-desktop.png`
- `firebase-client-auth-missing-webkit-phone.png`
- `flexible-routine-history-chromium-desktop.png`
- `flexible-routine-history-webkit-phone.png`
- `flexible-routine-runner-chromium-desktop.png`
- `flexible-routine-runner-webkit-phone.png`

The selected visual decision evidence remains in `.impeccable/mocks/companion-concepts/corner-companions-board.png` with its prompt and provenance sidecars. It isn't production UI evidence.
