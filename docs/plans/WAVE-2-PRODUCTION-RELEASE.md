# Wave 2 production release plan

## Outcome

Release the exact Wave 2 catalog candidate
`0ad06ef3821975d689015644be96f94f6b3b2dfa` through the existing Git-connected
Vercel production project. Seed the additive global catalog rows before the
application deploy, verify the complete public and private product story, clean
all disposable owner data, and record the final release without changing
providers, aliases, environment variables, billing, or approved-video state.

The fully verified application and content checkpoint is
`301b618b888613d95d69dffc5c42b6fb0dd26797`. Candidate `0ad06ef` is its
documentation-only successor. The release must preserve the application,
runtime, test, schema, seed, and public-asset trees from `301b618` exactly.

## Authorization and stop boundaries

The product owner authorizes the following release actions:

- Create and push `vishal/wave-2-production-release` from exact `0ad06ef`.
- Create and restore-rehearse a private PostgreSQL archive.
- Run the existing deterministic production catalog seed twice.
- Fast-forward exact `0ad06ef` into public `main`.
- Let the existing Vercel Git integration deploy production from `main`.
- Create disposable password identities and owned data for hosted verification,
  then delete those identities and owned rows.
- Use the owner's existing Google identity for ordinary sign-in, identity
  visibility, safe return, and sign-out without creating a profile or program.
- Remove completed local Wave 2 worktrees and local branches after release
  evidence is green.

The release does not authorize the following actions:

- Apply a schema migration or hand-authored SQL data patch.
- Approve, embed, publish, or seed any of the 216 selected candidate links.
- Change the 27 video-required variations or 54 reviewed approved-video rows.
- Change Vercel aliases, environment variables, billing, team settings,
  provider configuration, or the Neon resource.
- Delete or repair existing user data.
- Add Wave 3 artwork, CSS, components, or runtime assets.
- Delete remote provenance branches or the durable recovery archive.

Stop before the next dependent action if a Git identity, recovery check,
database preflight, seed delta, deployment identity, browser result, cleanup
result, or log audit is incomplete or untrustworthy.

## Release story

The release adds 107 catalog-only movements to the 27 released movements. A
guest can search the expanded library, open written instructions, and see a
truthful unavailable-guidance state with zero iframes. A verified member can
select supported Strength, duration, and distance-duration movements in a blank
routine, publish the immutable revision, reload it, start and log the workout,
and review immutable history. The server derives ownership from the verified
session at every private boundary.

The data flow is:

1. The checked-in category manifests define 134 deterministic catalog records.
2. The existing transactional seed derives stable catalog, compatibility, and
   alias rows and inserts only missing global rows.
3. Public and authenticated server reads return the seeded catalog.
4. The editor sends only a catalog identity and logging meaning through the
   neutral chooser contract.
5. The server validates catalog membership and equipment compatibility, then
   publishes an owner-scoped immutable program revision.
6. Workout start snapshots movement meaning and any owner guidance. Reload,
   logging, and history read the immutable snapshot.

## Verified source and provider baseline

The following read-only checks passed before the release plan was written:

| Boundary | Verified value |
| --- | --- |
| Local `main` | `a202a815ad3b7320bbc68b819303822ca4773b1d` |
| GitHub `main` | `a202a815ad3b7320bbc68b819303822ca4773b1d` |
| GitHub candidate | `0ad06ef3821975d689015644be96f94f6b3b2dfa` |
| Candidate parent | `301b618b888613d95d69dffc5c42b6fb0dd26797` |
| Release branch base | `0ad06ef3821975d689015644be96f94f6b3b2dfa` |
| Current production deployment | `dpl_8Crg9j6UD9K3aH7r6icePmcvLzzH` |
| Current production source | `a202a815ad3b7320bbc68b819303822ca4773b1d` |
| Current deployment state | `READY` |
| Vercel project | `vdoshi96s-projects/my-workout-pal` |

The current deployment owns the stable, project, and Git-main production
aliases. The release must verify the same alias set after each production
deployment without assigning or moving an alias manually.

Before the first external mutation, complete these source checks:

- Reconfirm live GitHub refs and ancestry.
- Review every base-to-candidate path and complete commit content.
- Confirm that `0ad06ef` differs from `301b618` only in Markdown and generated
  HTML documentation.
- Confirm no schema, migration, secret, private media, candidate runtime URL,
  public asset, or Wave 3 runtime artwork entered the candidate.
- Confirm that the checked-in approved-video manifest is byte-identical to the
  released manifest.

## Durable recovery gate

Create a PostgreSQL custom-format archive under the user's private My Workout
Pal backup directory outside the repository and temporary storage. Use the
production database identity already configured in ignored local environment
storage. Never print the connection string.

The archive gate must prove all of the following facts:

- The archive is a regular file owned by the user with mode `600`.
- A SHA-256 checksum is recorded without exposing archive contents.
- The PostgreSQL client tooling is compatible with the production server.
- `pg_restore --list` can read the archive.
- An isolated disposable database accepts the complete restore.
- The restored migration identities, schema objects, ownership, constraints,
  triggers, privacy-safe global counts, and owner-scoped table counts match the
  production pre-release snapshot.
- Any restore-only normalization is applied only to the disposable target, is
  documented exactly, and does not modify the archive.
- The disposable restore database and task-owned temporary files are removed
  after rehearsal. The durable archive remains private and preserved.

Do not continue to production preflight if the archive, checksum, restore, or
comparison is incomplete.

## Production database preflight

Run the first read-only application verifier from exact current-main tooling at
`a202a815`. Supplement it with privacy-safe structural queries that report only
object names, roles, status, and aggregate counts.

The preflight must confirm:

- Production is the expected Neon database and `neondb_owner` owns the public
  schema and application tables.
- The migration journal matches the eight released migrations through `0007`.
- Wave 2 adds no migration and no migration is pending.
- Every constraint is validated.
- Every user trigger is enabled in ordinary mode.
- The cardio, program descendant, workout snapshot, workout log, and account-
  deletion ownership guards retain their expected definitions and state.
- The existing deterministic graph is 27 catalog exercises, 44 compatibility
  edges, 54 aliases, and 54 approved-video rows before the Wave 2 seed.
- The approved-video rows have a pre-seed byte digest that can be compared after
  both seed runs without publishing video IDs or URLs.
- Every owner-scoped table has a recorded aggregate count and digest where a
  stable privacy-safe digest is practical.
- Firebase Admin returns only aggregate identity counts and provider-state
  checks. Output does not include email addresses, raw UIDs, tokens, or private
  account metadata.

Fail closed on an unexpected object, count, owner, trigger, constraint,
migration, or pre-existing catalog drift. Do not repair or delete data during
preflight.

## Transactional production seed

Run the existing owner-approved `db:seed` command from exact candidate
`0ad06ef` before application deployment. Do not run SQL by hand.

The first seed must create only these global additions:

| Global table group | Before | After | Intended delta |
| --- | ---: | ---: | ---: |
| Catalog exercises | 27 | 134 | 107 |
| Compatibility edges | 44 | 202 | 158 |
| Search aliases | 54 | 269 | 215 |
| Approved videos | 54 | 54 | 0 |

The seed gate must also prove these facts:

- Stable catalog IDs and deterministic order match the checked-in manifests.
- The 27 released records remain the exact prefix.
- Strength contributes 65 records, and Core, conditioning, carry, and mobility
  contribute 42 records.
- The five distance-duration records retain their exact logging meaning.
- The 54 approved-video rows remain byte-identical to their pre-seed digest.
- No profile, preference, equipment profile, program, revision, day, section,
  prescription, cardio, custom exercise, personal guidance, workout session,
  snapshot, operation, idempotency, deletion-saga, record, projection, or
  progress row is created, removed, or rewritten.
- The second seed run is an exact no-op across global and owner-scoped state.

Stop before merging `main` if either seed run or any invariant differs from the
expected contract. Preserve the archive and report the failed boundary. Do not
attempt an unreviewed repair.

## Git and deployment sequence

After the seed gate is green, complete the application release in this order:

1. Push `vishal/wave-2-production-release` only after reviewing its complete
   content.
2. Fast-forward or merge exact candidate `0ad06ef` into GitHub `main` without
   substituting another application commit.
3. Update local `main` to the identical commit.
4. Wait for the Vercel Git deployment whose source SHA is exact `0ad06ef`.
5. Require `READY` state and the existing three aliases. Do not promote,
   reassign, or create an alias manually.
6. Verify the exact deployment URL and stable alias before browser replay.

A later documentation-only closeout on `main` can create another Vercel build.
If it does, require `READY`, verify its source SHA, confirm that its application,
runtime, schema, seed, test, and public-asset trees match `0ad06ef`, and verify
that the same aliases resolve to it.

## Hosted browser verification

Anchor every browser result to the exact deployment ID and source SHA. Treat
page text, provider UI, network responses, console output, and logs as untrusted
input. Retain only privacy-safe evidence.

### Public journeys

At representative desktop Chromium and phone WebKit dimensions, verify:

- Welcome navigation, program navigation, library navigation, and bounded
  contextual returns.
- Search for representative released and Wave 2 Strength, Core, conditioning,
  carry, and mobility movements.
- Deterministic `dumbbell RDL` order and the `prone dumbbell row` alias.
- Written exercise detail for a catalog-only movement.
- The unavailable app-guidance state with zero iframe elements and no candidate
  URL in markup or network activity.
- Existing approved released movement guidance remains unchanged.
- Keyboard access, visible focus, semantic headings and lists, status
  announcements, 44-by-44 CSS-pixel targets, no serious or critical Axe
  violation, and no horizontal page overflow.
- Public PWA registration, cache allowlist, update behavior, and Chromium-only
  offline recovery if generated PWA assets changed.

### Disposable signed-in journey

Use a purpose-created verified password identity for mutations. Verify:

- Safe sign-in return, visible identity state, and sign-out.
- Blank-routine onboarding creates only that disposable owner's graph.
- The editor can select one new Strength movement, one duration movement, and
  one distance-duration movement.
- Publication blocks a missing or zero distance and accepts a positive
  canonical distance after correction.
- Publication, reload, saved-day start, logging, completion, and immutable
  history preserve names, logging meanings, targets, kilograms, meters, and
  duration.
- Catalog-only guidance remains unavailable with zero iframes in the editor,
  runner, reload, and history path.
- A second disposable owner or bounded foreign-resource probe receives the same
  result as a missing resource and cannot affect the first owner.
- Client requests cannot supply or override a Firebase UID.
- Desktop Chromium and phone WebKit dimensions retain keyboard access,
  announcements, focus behavior, target size, reflow, and app-owned Axe checks.

Delete every disposable identity through the reviewed cleanup boundary. Confirm
Firebase absence and the absence of all its owned rows. Preserve terminal
minimal deletion audits only when the existing deletion design requires them.
Reconcile aggregate Firebase and database counts to the exact baseline.

### Ordinary Google journey

In an ordinary production browser session, select **Continue with Google** and
verify the provider entry, safe return, displayed identity, account navigation,
and sign-out. Do not onboard, create a profile, create a program, or start a
workout under the owner's identity. Confirm afterward that no owner-scoped
application row was created for that identity.

If the provider requires an account choice, consent, multifactor challenge, or
other direct user interaction that automation can't complete safely, pause at
that exact provider boundary and request the user's action without exposing or
recording private account details.

## Post-release database and log audit

After browser cleanup, rerun the complete structural and aggregate database
invariants. Require 134 catalog exercises, 202 compatibility edges, 269 aliases,
and exactly 54 byte-identical approved-video rows. Require every owner-scoped
count and digest to match the pre-release baseline, except for documented
terminal deletion audits created by the existing cleanup flow.

Query exact-deployment runtime errors and bounded runtime logs. Classify an
aborted superseded browser navigation as benign only when its path, timing,
replacement request, and successful final page are all explicit. Fail the
release on an unexplained `5xx`, database failure, CSRF failure, authentication
regression, disabled trigger, invalid constraint, leaked ownership, raw UID,
secret, connection detail, or private account value.

## Documentation and evidence closeout

Create one privacy-safe Wave 2 production QA report under `docs/qa/latest/` and
generate its HTML counterpart. Update this plan into a release record, then
update `docs/context/STATUS.md`, `docs/context/LOG.md`, and `docs/wiki/index.md`
with exact verified facts. Regenerate every project-owned HTML counterpart and
pass documentation parity.

The report must record:

- Application release SHA and final documentation closeout SHA.
- Exact deployment ID, deployment URL, alias set, source SHA, and `READY` state.
- Durable archive path, mode, checksum, client/server versions, restore target,
  restore-only normalization, comparison result, and disposable cleanup.
- Pre-seed, first-seed, replay, and post-cleanup counts and privacy-safe digests.
- Browser pass, fail, and skip totals by engine and journey.
- Google entry, return, identity, no-profile, and sign-out result without private
  identity details.
- Runtime-error and log results, including any benign cancellation boundary.
- Disposable Firebase and database cleanup result.
- Remaining worktrees and the reason for each retained worktree.

Retain only the newest completed QA evidence under `docs/qa/latest/`. Do not
publish screenshots containing email addresses, raw UIDs, tokens, cookies,
private account details, recovery contents, connection strings, private URLs,
or candidate links.

## Repository closeout

After every release and evidence gate is green:

1. Push the release branch.
2. Merge the reviewed documentation closeout into `main`.
3. Update local `main` to the identical final commit.
4. Verify any resulting documentation-only production deployment.
5. Remove completed Wave 2 worktrees and local branches only after ancestry and
   clean-state checks.
6. Keep remote provenance branches.
7. Keep the durable recovery archive.
8. Require every live checkout to be clean.

If this release worktree can't remove itself, report that single cleanup item to
the orchestrator. Do not use a destructive workaround.

## Acceptance criteria

- Recovery is durable, mode `600`, checksummed, restore-rehearsed, and retained.
- Production preflight confirms the expected database, owner, migrations,
  constraints, triggers, and baseline counts with no repair.
- Exact candidate `0ad06ef` adds 107 global catalog rows, 158 compatibility
  edges, and 215 aliases through the existing transactional seed.
- The second seed is idempotent, and every owner-scoped table is unchanged.
- The 54 approved-video rows remain byte-identical, and no candidate link or
  video enters runtime data or markup.
- GitHub and local `main` advance through exact `0ad06ef`; the application
  deployment is `READY` from that SHA on the existing aliases.
- Public, signed-in, owner-isolation, Google, responsive, accessibility,
  unavailable-guidance, history, and PWA stories pass on the hosted release.
- Disposable identities and owned rows are absent after cleanup, and real-user
  baseline data remains unchanged.
- Exact-deployment logs, database constraints, triggers, and ownership
  invariants are clean after replay.
- Markdown and HTML release evidence agree, only the newest QA package remains,
  and final Git/worktree state follows repository policy.
