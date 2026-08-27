# Wave 0 integration

## Outcome

Produce one local release candidate that combines the authentication entry handoff, flexible routine publication, and the selected Corner Companions decision packet. Preserve each source branch's functional and safety contracts, reconcile their shared planning seed into one authoritative record, and stop before public publication or production release.

The integration contains the Corner Companions decision and review assets only. It doesn't add production companion components, visual CSS, or runtime behavior.

## Inputs and provenance

Integrate the following completed inputs in order:

1. Authentication entry handoff at `871fb4ace20bd5b780c5dc4fd8014ede9a352bb6`, including implementation commit `8dc093a7e419cce57e6b164d42f2c17aaad8e686`.
2. Flexible routine publication at `452c8a41f5d375862e67999f2cbfa39a5fee41da`, including migration `0005_flexible_routine_topology`.
3. Corner Companions selection at `acfc4e60013c46da294fe62bb1cfe0a85cb5839f`.

Preserve merge provenance. Resolve overlapping copies of the approved repositioning, library-expansion, product, context, design, and wiki text by retaining one coherent version that reflects all integrated outcomes. Replace branch-specific files in `docs/qa/latest/` only after the integrated QA report and evidence are verified.

## Navigation and states

- Public visitors can enter through the ordinary account path from the welcome, program, day, sample-workout, and public navigation surfaces.
- Authentication return targets stay bounded to safe same-origin application routes. Auth routes, protocol-relative destinations, external URLs, encoded controls, and malformed values fail closed.
- Signed-in members see a visible identity and sign-out path.
- Members can create, edit, publish, reload, and activate arbitrary custom routine topologies.
- Stable day identifiers remain routable after titles and order change.
- A day can contain zero or one cardio prescription. Publication rejects more than one cardio prescription.
- Workout entry distinguishes starting a session, resuming the active session, and resolving a conflicting active session.
- History and runner surfaces render immutable session snapshots and labels rather than mutable active-program names.
- Equipment changes create a confirmed program revision and preserve historical topology.
- Missing, malformed, unauthenticated, unverified, foreign-owner, offline, and persistence-failure states remain truthful and recoverable.

## Types and persistence

- Keep stable day and prescription identifiers distinct from mutable titles, order, and labels.
- Store routine topology, publication state, revisions, snapshots, and session linkage in the schema introduced by migration `0005_flexible_routine_topology`.
- Keep weight in kilograms and distance in meters at storage boundaries.
- Preserve immutable program-revision and workout snapshots.
- Treat the server-confirmed active revision as the source for workout creation and equipment changes.
- Confirm that no other migration claims sequence `0005` in the clean base or integrated result.

## Authorization and privacy

- Derive Firebase UID ownership from the verified server session for every owned query and mutation.
- Reject or ignore client-supplied ownership and lifecycle fields.
- Return foreign-owned programs, revisions, workouts, and sessions as indistinguishable from missing resources.
- Preserve recent-authentication, same-origin CSRF, secure-cookie, verification, and no-store contracts.
- Keep the raw recording, derived media, private curation material, and unselected design concepts outside the integration.
- Keep Corner Companions assets local. Don't push them to the public repository without separate authorization.

## Failure recovery

- Keep authentication entry usable when Firebase client configuration is unavailable, and describe unavailable provider behavior truthfully.
- Normalize a safe return target before sign-in and reauthentication. Fall back to the bounded default when validation fails.
- Make publication retries reconcile an accepted server write even if the first response is interrupted or reports an error.
- Preserve unsaved editor input after validation or persistence failure.
- Prevent a second active workout from silently replacing or mutating an existing session.
- Reconcile resumable local workout operations against the owner-matched immutable server snapshot.
- Keep offline and failed writes visibly unsaved until the server confirms them.

## Responsive behavior and accessibility

- Verify account entry, routine editing, publication, workout entry, and history on Chromium desktop and WebKit phone production-mode paths.
- Keep labels, names, status messages, focus order, keyboard operation, landmarks, and error associations accessible.
- Prevent horizontal overflow and obscured controls at the required phone and desktop viewports.
- Preserve reduced-motion behavior and don't rely on color alone for state.
- Treat Corner Companions boards as decision evidence with descriptive documentation, not as production UI.

## Migration and deployment order

The local candidate proves the complete PGlite chain from `0000` through `0005`, schema metadata, seed compatibility, and application behavior. Production release remains a separate authorization gate.

If production release is authorized, use this order:

1. Confirm the exact release commit and a clean schema-owner environment.
2. Back up or otherwise establish the approved Neon recovery point.
3. Run the migration preflight against production without application writes.
4. Apply `0005_flexible_routine_topology` through the designated schema owner.
5. Verify migration metadata, constraints, existing rows, starter seed invariants, and replay idempotency.
6. Deploy the application commit that expects migration `0005`.
7. Replay public, authenticated, ownership, and error-log checks on the exact deployment.
8. Promote or alias only after every release check passes.

Never deploy the application before the schema-owner migration succeeds and its post-migration verification passes.

## Public-repository and provider gates

- Don't push `vishal/wave-0-integration`, the Corner Companions assets, or the decision packet.
- Don't merge the integration into `main`.
- Don't alter Firebase, Vercel, Neon, GitHub, DNS, or production aliases.
- Don't apply migration `0005` to production or run production writes.
- Record real Google authentication as a hosted-provider replay gate when local or preview verification can't exercise the configured provider. Don't simulate Google authentication.
- Require separate user authorization before publishing Corner Companions assets or documentation to the public repository.

## Acceptance criteria

- The integration branch contains the exact three source commits with preserved ancestry or explicit cherry-pick provenance.
- Authentication entry, safe return handling, identity, and sign-out contracts pass.
- Arbitrary routine topology creation, editing, publication, reload, and activation pass.
- Stable day routing and zero-or-one-cardio semantics pass.
- Start, resume, and active-session conflict behavior pass.
- Immutable history labels, workout snapshots, and equipment-revision topology pass.
- Foreign-owner access remains indistinguishable from missing data.
- The integrated documentation selects only Corner Companions and includes no production companion implementation.
- Markdown and generated HTML remain in parity.
- `docs/qa/latest/` contains only the newest integrated QA report and its verified evidence.
- The final branch is clean and ends in a local integration commit.

## Test ladder and retained evidence

Run the following checks on the combined result and record exact totals:

1. Inspect the final Git diff, merge ancestry, migration SQL, Drizzle snapshot, and journal.
2. Run `git diff --check` against the clean base.
3. Run the complete in-memory PGlite migration chain from `0000` through `0005`.
4. Run all database schema, migration, repository, and exact-two seed checks.
5. Run TypeScript, ESLint, and the complete Vitest suite.
6. Verify generated service-worker and documentation parity.
7. Create the production Webpack build and verify route boundaries.
8. Run the full public production-mode browser matrix.
9. Run the authenticated production-mode fixture across the required Chromium desktop and WebKit phone paths.
10. Exercise account entry, safe/private returns, visible identity, sign-out, flexible publication, stable routes, cardio bounds, workout conflicts, immutable snapshots, equipment revisions, and foreign-owner safety.
11. Inspect the selected Corner Companions packet and confirm that no runtime visual implementation entered the diff.

If integration exposes a defect, retain a concise failed-before test or reproduction and its passed-after result. After all checks pass, generate paired `WAVE-0-INTEGRATION-QA.md` and `WAVE-0-INTEGRATION-QA.html` files, retain only their newest supporting screenshots or reports in `docs/qa/latest/`, and preserve historical planning records elsewhere.
