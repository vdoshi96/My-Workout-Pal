# Wave 4 production release

## Outcome

Release the exact reviewed companion-integration candidate
`5c416d774fb53c3a4f5f5623ef1a202fca4b07ee` through the existing GitHub-main
and Vercel production path. Prove the public, authenticated, offline,
accessibility, native-zoom, authentication, persistence, authorization, and
cleanup boundaries on the exact deployment. Finish with one privacy-safe paired
production report, synchronized authoritative documentation, clean local Git
state, and production on the exact final `main` SHA.

This release changes presentation, public assets, test infrastructure, and
documentation. It does not change the production schema, migrations, seed,
API, repositories, authentication implementation, dependency manifest, or
lockfile. Preserve the released Wave 2 database graph and recovery archive.

## Authorization and stop boundaries

The product owner authorizes the following actions for this release:

- Create and push `vishal/wave-4-production-release` from exact candidate
  `5c416d7`.
- Inspect the exact candidate preview and the automatic Git-connected
  production deployments.
- Merge and push the reviewed lineage into GitHub `main`, then fast-forward
  local `main` to the same commit.
- Create verified disposable password identities and owner-scoped application
  data for hosted QA, then remove the exact identities and all owned rows.
- Exercise ordinary production **Continue with Google** without onboarding or
  creating application data.
- Run read-only database, Firebase aggregate, Vercel deployment, and bounded log
  checks.
- Remove completed pilot, rollout, integration, and release worktrees and local
  branches after final evidence is green.

The release doesn't authorize these actions:

- Run a production migration, seed, hand-authored data patch, or schema repair.
- Add an authentication provider domain merely to make preview sign-in work.
- Move or create an alias, change environment variables, change provider
  configuration, or change billing unless the automatic exact deployment fails
  and a separately reviewed recovery action becomes necessary.
- Approve, seed, publish, or relabel an unreviewed exercise video.
- Record or retain credentials, tokens, cookies, UIDs, email addresses, private
  URLs, private routine names, fitness values, raw logs, HAR files, traces, or
  videos.
- Delete the private Wave 2 recovery archive or remote provenance branches.

Stop only at an unavoidable owner-only account selection, consent, MFA, or
CAPTCHA boundary, or before an action outside this release scope. A blocked
Google lane does not block completion of independent release gates.

## Source identity and lineage

The release must retain these exact identities:

| Boundary | Required identity |
| --- | --- |
| Public base | `298cb04b8b16ad6c3586ef74bc95df7301533472` |
| Reviewed pilot | `b4499f3b953a5745039f1bca67da68e6e135c7c3` |
| Reviewed rollout | `709a977bbccc0333517e873955c0b3572e70bd9f` |
| Integration merge | `d962dfb59a51b7bb0cf57cda19ea611a0ec32fa7` |
| Release candidate | `5c416d774fb53c3a4f5f5623ef1a202fca4b07ee` |
| Release branch | `vishal/wave-4-production-release` |

The pilot must remain an ancestor of the rollout. The rollout and integration
merge must remain ancestors of the candidate. Merge the candidate lineage as a
single reviewed unit without broad conflict resolution.

## Application story

Wave 4 carries the reviewed Corner Companions system from the guest welcome and
Progress preview into the public and member Library, routine editor, History,
Settings, and neutral workout runner. Each companion is decorative, static,
pointer-inert, hidden from assistive technology, absent from forced-colors mode,
and separate from private data and task-critical controls.

The hosted data flow remains unchanged:

1. Public routes render from the deployed application and public catalog.
2. Firebase signs in a member and exchanges a fresh identity token for the
   server's secure session.
3. Server code derives ownership from that session and reads or writes Neon
   through existing owner-scoped repositories.
4. Routine publication creates an immutable program revision.
5. Workout start snapshots movement meaning and personal guidance.
6. IndexedDB retains owner-namespaced drafts and reconciles them against the
   server snapshot without trusting a client-supplied UID.
7. History reads immutable completed-session data.

No release step may add a parallel persistence or authorization path.

## Verified preflight baseline

The following checks passed on August 30, 2026, before any release mutation:

| Boundary | Verified value |
| --- | --- |
| Local candidate | Clean exact `5c416d7` |
| Remote candidate | Clean exact `5c416d7` |
| Local and remote `main` | Clean exact `298cb04` |
| Worktrees | Primary, release, pilot, rollout, and integration clean |
| Candidate preview | `dpl_348br8EQdnW2QJXVEhQhHDrSVY5j`, `READY`, exact `5c416d7` |
| Preview URL | `my-workout-5i32mnwkd-vdoshi96s-projects.vercel.app` |
| Current production | `dpl_BCqhQKuzvMU9GYPUoEbhhdoEkeY5`, `READY`, exact `298cb04` |
| Application rollback | `dpl_DYxcb4ennqnstt8sFR2dkLXnomkn`, exact runtime `0ad06ef` |
| Production aliases | Stable, project, and Git-main aliases unchanged |
| Vercel variables | Required database and Firebase names present in Production and Preview; values not read or printed |
| Database | Neon PostgreSQL 18.6 as `neondb_owner`; public schema owned through `pg_database_owner` |
| Migrations | Eight applied migrations through repository migration `0007` |
| Structure | 36 public tables, 12 public functions, zero invalid constraints or indexes |
| Triggers | All 17 user triggers enabled in ordinary mode |
| Global graph | 134 exercises, 202 equipment edges, 269 aliases, 54 approved videos, 27 eligible variations |
| Owner baseline | Zero owner-scoped application rows; 83 of 83 deletion audits terminal |
| Approved-video fingerprint | SHA-256 `e8c7a3be7a7cff96ce6963d8688fbfcae8dcd1ce28a969113bf0f4260ce2fd6c` for the release-time full approved-row projection |

The candidate scope audit found no path under `drizzle/`, `src/app/api/`,
`src/server/repositories/`, `src/server/auth/`, or `src/components/auth/`, and
no change to `package.json`, `pnpm-lock.yaml`, or `pnpm-workspace.yaml`.
Therefore this release must not create a database dump, run a migration, or run
the seed. The existing Wave 2 archive remains the recovery artifact.

## Recovery

Preserve the private custom-format archive at the documented external backup
path. Verify only its existence, ownership, mode, size, checksum, and PostgreSQL
18 readability. Do not copy it into the repository or QA evidence.

The verified archive contract is:

- Mode `600` for the archive and adjacent checksum.
- Size 201,206 bytes.
- SHA-256
  `d196af1c16afe661774ca5e758e1d6e9123065a066411bde3cb0c7639c58364e`.
- 334 readable table-of-contents entries with PostgreSQL 18.6 tooling.
- Previously completed isolated restore rehearsal with `--no-owner --no-acl`.

Use deployment `dpl_DYxcb4ennqnstt8sFR2dkLXnomkn` as the application rollback
point. Don't move aliases preemptively. If automatic deployment fails, inspect
the exact failure and review the smallest recovery action before changing any
production pointer.

## Exact-candidate preview gate

Use preview deployment `dpl_348br8EQdnW2QJXVEhQhHDrSVY5j` only after
confirming that it remains `READY` from exact source `5c416d7`. Inspect:

- Build output and runtime logs for compile, function, database, asset, and
  service-worker errors.
- Security and cache headers on public, private, static, manifest, service
  worker, and offline responses.
- The web manifest, service worker, hashed static assets, and all 16 companion
  WebP variants.
- Public `/`, `/progress`, `/library`, one program detail, one exercise detail,
  `/sign-in`, and `/offline`.
- Unauthenticated `/app` and owned routes for bounded redirect behavior and
  `no-store` private responses.

Do not add a Firebase authorized domain for the preview. Preview authentication
may stop at the truthful provider-domain boundary; production authentication is
the authoritative provider proof.

## Git and production deployment sequence

After the preview, source, recovery, and database gates remain green:

1. Commit and push the paired release plan on the dedicated branch.
2. Merge the exact candidate lineage into `main` without unrelated conflict
   resolution.
3. Push GitHub `main` and verify the remote SHA directly.
4. Fast-forward local `main` to the identical SHA.
5. Wait for the Git-connected production deployment.
6. Require `READY`, exact Git source, and the existing alias set.
7. Do not promote the preview, redeploy manually, or move an alias when the
   automatic deployment succeeds.

## Public production matrix

Exercise these routes on the exact production deployment:

- `/`, `/progress`, `/library`, a representative program/day detail, a
  representative exercise detail, `/sign-in`, and `/offline`.
- Widths 320, 390, 430, 820, 1,280, and 1,440 pixels across the maintained
  Chromium and WebKit phone, tablet, and desktop lanes.
- Light, dark, reduced-motion, and forced-colors states.
- Keyboard and pointer navigation, focus visibility, image failure, and
  app-owned Axe checks.
- Zero horizontal overflow, clipping, overlap, unreachable action, or obscured
  product data.

For every decorative companion, prove empty alt text, `aria-hidden`, no role,
no accessible name, no focus or tab stop, pointer inertness, and no overlap with
controls or data. Prove that image failure leaves meaning and actions intact.

## PWA and offline matrix

Run live Chromium offline replays for `/`, `/progress`, and `/library` on the
exact production deployment. Prove service-worker cache v6 includes only the
public planning hedgehog, reviewing raccoon, and cataloging otter variants.

The cache must exclude:

- Preparing fox, routine-drafting beaver, history-archive tortoise,
  settings-packing hare, and workout-corner bear variants.
- Every `/app/*` and `/workout/*` route.
- APIs, authenticated HTML, personal guidance, owner data, and arbitrary image
  URLs.

Record the maintained WebKit service-worker automation limitation. Preserve an
owner-namespaced IndexedDB draft through the offline and reload checks and prove
that public cache cleanup does not delete it.

## Authenticated production matrix

Use one purpose-created verified password member for the mutating lane and a
second exact owner only where foreign-resource denial requires it. Keep all
credentials and identities in process memory. Exercise:

- `/app` account shell and unmistakable member state.
- Member Library and personal-guidance boundaries.
- Routine editor, including the equipment-review state that collapses the
  drafting beaver.
- History list and detail.
- Settings stable, dirty, saved, reauthentication, deletion review, failure,
  and completion states.
- Runner neutral, logging, timer, guidance, offline, authentication, recovery,
  pending, error, and terminal states.
- A blank-routine, workout, and immutable-history flow sufficient to prove the
  actual product and persistence boundaries.

Prove that client requests don't contain or override a Firebase UID. A foreign
resource must be indistinguishable from a missing resource and must not change
data. Always run the reviewed exact-identity cleanup in `finally`, including
after failure. Require Firebase aggregate counts and every owner-scoped Neon
count to return to the preflight baseline.

## Ordinary Google proof

Use an ordinary production browser session and select **Continue with Google**.
Require a bounded `/app` return, a generic visible verified identity state, no
onboarding or profile/program/workout/guidance creation, app sign-out, and a
direct `/app` return to `/sign-in`.

Never record identity details. If Google presents an owner-only account choice,
consent, MFA, or CAPTCHA boundary that the existing authorized session cannot
complete, stop this lane at that exact state, surface it immediately, and
continue independent release gates.

## True native 200% zoom

Use a real Chrome browser process, its native zoom control, and the exact
production origin. Cover public Library, member Library, routine editor,
equipment review, History, Settings, and runner surfaces.

At 200%, record device pixel ratio, CSS viewport, and `visualViewport.scale ===
1`. Prove single-axis reflow, zero horizontal overflow or overlap, reachable
controls, and visible keyboard focus. Restore the same browser to 100% and
verify the restoration. Do not substitute CDP page scale, CSS `zoom`, a halved
viewport, or screenshot inference. End only verified orphaned Playwright
Chrome-for-Testing processes; never stop a regular user Chrome process.

If Safari or WebKit cannot expose an exact native zoom value, record that
capability limitation without relabeling responsive emulation as native zoom.

## Bounded production log audit

Record the hosted QA start and end times, then query the exact deployment for
that bounded window. Fail on unexplained `5xx` responses, function crashes,
database or Neon failures, CSRF failures, authentication or ownership failures,
asset errors, or service-worker errors.

Classify a status-200 superseded RSC, manifest, or image cancellation as benign
only when the exact initiating navigation, replacement request, and successful
final page are present. Retain only summarized counts and classifications, not
raw logs.

## Documentation and evidence

After the application deployment passes, create one canonical paired report:

- `docs/qa/latest/WAVE-4-PRODUCTION-RELEASE-QA.md`
- `docs/qa/latest/WAVE-4-PRODUCTION-RELEASE-QA.html`

Update `docs/context/STATUS.md`, `docs/context/SOURCES.md`,
`docs/context/DECISIONS.md`, `docs/wiki/index.md`, `DESIGN.md`, and
`design-qa.md`, plus their generated HTML counterparts. Keep only the newest
coherent privacy-safe production evidence under `docs/qa/latest/`.

The report must identify exact SHAs, deployment ID and URL, aliases, rollback
point, database invariants, test matrices and intentional skips, asset hashes,
cache classes, native-zoom metrics and restoration, Google outcome, cleanup,
bounded log result, and every retained limitation. It must not contain a raw
log, trace, cookie, token, UID, email, private URL, private note, routine name,
or fitness value.

Merge and push the documentation closeout to `main`. Let its automatic
docs-only deployment become `READY`. Verify that its runtime/application tree
is byte-identical to the proved application deployment. Finish with local
`main`, `origin/main`, and production on the exact final documentation SHA, then
rerun proportional documentation, static, database-read, runtime, and hosted
smoke gates.

## Cleanup and closeout

After all proof and documentation are green:

- Remove `.next`, authenticated fixture builds, Playwright reports, traces,
  `test-results`, and task-created temporary or private screenshots and data.
- Keep only the newest reviewed production evidence.
- Confirm the pilot, rollout, integration, and release tips exist remotely and
  are ancestors of final `main`.
- Remove completed pilot, rollout, integration, and release worktrees and local
  branches without deleting remote provenance refs.
- Leave the primary checkout on clean `main` at the exact remote and production
  SHA.
- Require zero disposable Firebase password identities, zero owner-scoped
  application rows, all retained deletion audits terminal, and no unrecorded
  worktree.

## Acceptance criteria

The release is complete only when all of these conditions are true:

- Exact candidate and lineage identities are verified from fresh remote refs.
- The preview and both automatic production deployments are `READY` from the
  expected exact SHAs.
- No schema, migration, seed, provider, environment, billing, or alias mutation
  occurred.
- Public, authenticated, PWA, accessibility, companion, Google, native-zoom,
  and log gates are either green or carry one precise capability limitation.
- Database structure and the 134/202/269/54/27 contract match before and after.
- Owner-scoped rows and Firebase identities return to the exact baseline.
- The final paired report and authoritative documentation are in parity.
- Local `main`, `origin/main`, and production identify the same final SHA.
- Completed worktrees and local branches are removed, generated private
  artifacts are absent, and remote provenance branches remain.

## Execution record

The preflight baseline in this plan is verified. Release execution, production
browser proof, documentation closeout, final deployment reconciliation, and
cleanup remain pending until their evidence is recorded in the canonical
production report.
