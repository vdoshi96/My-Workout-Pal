# Wave 1 integration plan

## Outcome

Produce one reviewable local integration candidate on `vishal/wave-1-integration` from the exact Wave 1 source tips. Preserve each branch's behavior and Git provenance, prove the combined schema and product contracts locally, and push the candidate without merging it into `main` or changing production.

The candidate must compose the signed-in home handoff with the existing program-creation and flexible-editor persistence path. A member can choose the five-day example or a blank routine, edit arbitrary bounded topology, select canonical or private movements, attach owner-only guidance, publish an immutable revision, and start the exact saved day. The integration must not create a second routine persistence path.

## Scope and stop boundaries

This integration may:

- Create and push `vishal/wave-1-integration`.
- Merge the three exact source tips into the integration branch in the approved order.
- Resolve integration conflicts and add integration-only tests, product composition, migrations metadata, documentation, and local QA evidence.
- Run the complete migration chain against local PGlite and run local production-mode browsers.

This integration must not:

- Merge or fast-forward `main` locally or on GitHub.
- Apply a migration to Neon or any other external database.
- Seed the 216 product-approved candidate links or label them runtime-approved.
- Deploy, promote, change an alias, change a provider, or modify paid configuration.
- Remove sibling worktrees or source branches.
- Add Corner Companions production art or CSS.

## Verified intake

The clean integration base is `4622f9e1b7783fd35cb6c23ae9396148c7c3357a`. Before branch creation, detached `HEAD`, local `main`, `origin/main`, and their merge base all resolved to that commit, with no tracked or untracked changes.

The remote source tips are:

| Package | Remote branch | Required tip |
| --- | --- | --- |
| Flexible day builder | `origin/vishal/flexible-day-builder` | `af43c950991de499b8e32a6fac5d58f19be44eed` |
| Library and personal guidance | `origin/vishal/library-guidance-foundation` | `b54801b28d40eb106f38fea44ac1da71d468b199` |
| Personal home and companion copy | `origin/vishal/companion-home-copy` | `b1722b0e9bd1c0e5185f5bc40856667266c44d22` |

Each tip has the required base as its merge base. A read-only GitHub query confirmed that the three remote heads resolve to the required commits.

## Integration order and provenance

Integrate the branches in the following order:

1. Merge `af43c950991de499b8e32a6fac5d58f19be44eed` and retain its commits, including chooser checkpoint `2436bac92ba3381e76646bf61210cd5fd4dae88f`.
2. Merge `b54801b28d40eb106f38fea44ac1da71d468b199`. Library checkpoint `5255a525` introduces the same four blobs as `2436bac9`, so resolve the shared history as one contract rather than keeping incompatible duplicates.
3. Merge `b1722b0e9bd1c0e5185f5bc40856667266c44d22` and reconcile home, onboarding, fixture, locator, documentation, and generated-output overlaps without discarding either branch's behavior.

Use merge commits so the candidate records the exact source parents. Record every manual conflict resolution in the QA report. Do not squash the source branches.

## Integration-only failed-before evidence

Worker reports already contain their feature-level red-to-green evidence. Do not recreate or fabricate those failures.

Retain concise integration-only failed-before evidence from the first combined state, including:

- Textual merge conflicts and their paths.
- Duplicate or stale generated documentation and service-worker output.
- A migration-chain, schema snapshot, fixture, or journal mismatch caused by combining `0006` and `0007`.
- A missing example-versus-blank home composition or duplicate persistence seam.
- Combined test, build, route, or browser failures that did not exist on the isolated branches.

Record the exact command, focused failure, root cause, correction, and passing replay. Infrastructure failures remain separate from product failures.

## Product composition

### Navigation and home states

Keep `/app` as the private default after sign-in. It derives identity, verification, active program, resumable workout, and progress from server-owned data.

The home must keep the following states coherent:

- New account: show one choice between **Start with the example** and **Start blank**. Both choices call the existing owner-scoped program-creation boundary.
- Ready account: make the next workout or routine action clear and retain edit, library, history, progress, and settings navigation.
- Active workout: make **Resume workout** dominant, suppress competing starts, and retain read-only program, day, library, history, progress, and settings navigation.
- Unverified password account: keep browsing and review available, explain the verification gate, and block permanent creation, editing, and starts.
- Empty progress: show no sample values on private routes.
- Loading and persistence error: keep account identity and safe navigation visible, retain entered choices, and provide retry without duplicating a program.

Keep public `/progress` canonical and public-cacheable. Keep `/sample-progress` as a permanent redirect. Render **Sample data · not your history** once on the public preview. Keep `/app/progress` private and uncached.

### Routine types and persistence

The day builder owns day, section, prescription, and cardio placement; topology; stable keys; default retention and reset; publication; and exact-start behavior. Preserve arbitrary bounded day and section names and counts, optional sections and cardio, authored cardio order, and final-row safeguards.

Example and blank creation use the existing onboarding request, retry key, owner-scoped repository transaction, and exactly-one-active-program invariant. The mode participates in the idempotency hash and strict response contract. Example uses the starter template; blank writes one minimal valid published custom graph inside that same transaction and enters the existing editor/publication lifecycle. There is no client-only shortcut, hidden starter clone, or parallel API route.

Every successful publication creates a complete immutable revision. Starting a workout snapshots the selected revision, day, exercise meaning, targets, and resolved guidance. Later edits can't rewrite an active or completed workout.

### Library, chooser, and guidance boundary

Retain the neutral chooser result exactly:

```ts
{
  source: { kind: "catalog" | "custom"; id: string };
  name: string;
  loggingKind: LoggingKind;
}
```

`replace` requires a current selection. `add` and `seed-day` don't. Keep editor positions, topology, defaults, equipment metadata, search state, and guidance out of this callback.

The library owns generated catalog manifests, compatibility and private loading, search, inline private creation, owner-scoped personal guidance, and guidance snapshots. Guidance is stored separately from public catalog data and never changes public approval state. The chooser returns a selection to the day builder, which decides where to place it.

### Authorization and privacy

- Derive Firebase UID only from the verified server session.
- Reject client ownership and lifecycle fields.
- Keep custom exercises and personal guidance owner-scoped, with foreign resources indistinguishable from missing resources.
- Keep stable opaque keys and safe, normalized HTTPS guidance URLs.
- Keep private links and owner identifiers out of errors, logs, public caches, analytics, and documentation evidence.
- Keep the 216 candidate links outside runtime-approved guidance until each video passes the separate full-watch curation gate.

### Recovery and accessibility

Creation, guidance changes, publication, and workout operations retain stable retry keys through interrupted responses. A malformed or ambiguous success response can't advance client state. Stale revisions preserve the draft and offer an explicit recovery action.

Every interactive path must work with keyboard input and visible focus, expose status changes to assistive technology, preserve label-in-name, and avoid focus loss after movement or topology changes. Phone layouts must keep fixed navigation clear, prevent horizontal overflow, and keep destructive review and chooser controls reachable. Reduced motion and forced colors must remain usable. No Wave 3 decorative production assets may enter these surfaces.

## Migration and schema gate

Keep this local order:

1. `0000_initial.sql`
2. `0001_account_deletion_saga.sql`
3. `0002_workout_canonical_measurements.sql`
4. `0003_program_collection.sql`
5. `0004_personal_record_projection_checkpoint.sql`
6. `0005_flexible_routine_topology.sql`
7. `0006_program_cardio_display_order.sql`
8. `0007_personal_guidance.sql`

Regenerate or reconcile `0007_snapshot.json` and the Drizzle journal against the integrated `0006` schema. Update authenticated PGlite fixture migrations, bootstrap assertions, and schema tests so they use the same chain.

Review both new migrations for:

- Server-derived ownership and composite owner constraints.
- Backfill determinism and non-null transitions.
- Check constraints, uniqueness, indexes, and foreign-key delete behavior.
- Interaction with program and workout immutability triggers.
- Local rollback and recovery implications.
- The requirement to apply `0006` before code reads cardio display order and `0007` before code reads or writes guidance.

Run the empty local PGlite migration chain from `0000` through `0007`, repository/bootstrap checks, and migrated-fixture behavior. Do not connect these commands to production.

## Acceptance criteria

The candidate is acceptable only if all of the following conditions are met:

- Git history contains the exact three source tips and documents every integration correction.
- The chooser contract remains byte-identical to the agreed checkpoint.
- Example and blank creation share one owner-scoped persistence path.
- Flexible topology, canonical/private chooser, inline private creation, personal guidance, publication, exact start, resume, history, equipment revisions, and owner isolation compose without regression.
- Zero-cardio and one-cardio days preserve authored order and exact workout behavior.
- Active sessions suppress competing starts while review navigation stays available.
- `/progress`, `/sample-progress`, sample disclosure, identity, verification, and sign-out behavior remain correct.
- The `0000`-`0007` local migration chain and schema/bootstrap checks pass.
- No candidate video is seeded, no production migration runs, and no deployment or alias/provider change occurs.
- Only the newest coherent QA report and browser evidence remain under `docs/qa/latest/`.

## Verification matrix

Run one gate at a time and record exact totals:

- Strict TypeScript.
- Full ESLint.
- Full Vitest.
- Drizzle metadata, schema, migration, repository, and bootstrap checks.
- Deterministic seed and exact-two approved-video checks.
- Generated PWA/service-worker parity.
- Documentation build and parity.
- `git diff --check`.
- Next.js Webpack production build.
- Production route-boundary verification.
- Maintained public production-mode browser matrix.
- Combined authenticated production-mode Chromium desktop and WebKit phone journeys.

The authenticated journey must cover example and blank creation, arbitrary editor operations, canonical and private selection, inline private creation, personal-guidance replacement, publish and reload, exact start, zero-cardio and one-cardio behavior, resume conflict, immutable history after edits, equipment revision, every personal-home state, unverified gates, and cross-owner safe failures.

## Evidence retention and closeout

The integration report and its generated HTML counterpart were canonical until
the production release. After the production package passed, the source
provenance and combined acceptance record were folded into
`docs/qa/latest/WAVE-1-PRODUCTION-RELEASE-QA.md`; superseded integration output
and screenshots were removed. Retain only that newest coherent production
package and its required screenshots.

Commit integration corrections with focused messages, then push `vishal/wave-1-integration`. Report source SHAs, merge and correction commits, migration identities and order, verification totals, retained evidence, limitations, and the separate production release sequence. Stop before merging `main` or performing any release action.
