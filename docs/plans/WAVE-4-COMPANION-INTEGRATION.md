# Wave 4 companion integration plan

## Outcome and release-candidate boundary

Integrate the reviewed Wave 3 Corner Companions rollout into the Wave 4 release
candidate from exact public `main` commit
`298cb04b8b16ad6c3586ef74bc95df7301533472`.

The integration branch is `vishal/companion-integration`. The reviewed source
lineage is linear:

1. Wave 3 pilot `b4499f3b953a5745039f1bca67da68e6e135c7c3`.
2. Wave 3 rollout `709a977bbccc0333517e873955c0b3572e70bd9f`.

The pilot is an ancestor of the rollout. Integrate the rollout lineage exactly
once as one source line. Do not cherry-pick, merge, or recreate the pilot as a
separate patch. Treat Steps 1-5 of the Wave 4 chronology as released through
Wave 2 on `main`; do not remerge historical authentication, routine, library,
catalog, or guidance branches.

This iteration stops at a clean pushed integration branch. It does not merge
`main`, deploy, change an alias, provider, environment variable, billing
setting, or production user, apply a migration, run a seed against a database,
change production data, or remove the pilot or rollout worktree.

## Verified preflight

- The worktree began clean and detached at exact base
  `298cb04b8b16ad6c3586ef74bc95df7301533472`.
- A fresh `git ls-remote` query proved exact remote identities for `main`,
  `vishal/pal-visual-pilot`, and `vishal/pal-visual-rollout`.
- `git merge-base --is-ancestor` proved both `main -> pilot` and
  `pilot -> rollout` ancestry.
- The rollout range contains exactly two commits: the pilot commit followed by
  the rollout commit.
- The rollout diff changes no production schema, migration, seed, API,
  repository, authentication implementation, dependency manifest, workspace
  resolution, or lockfile. Authentication-named changes are isolated to the
  production-component browser fixture and its tests.
- The rollout diff passes `git diff --check`.
- One tracked design-board sidecar exposes an absolute generated-image source
  path. Scrub that field during integration so public provenance contains no
  absolute local path or generator identifier.

If the final integrated diff introduces any production schema, migration,
seed, API, repository, or authentication change, stop and report the finding.
Do not reinterpret that change as visual-only integration work.

## Product and visual truth

Preserve the reviewer-approved Corner Companions system and its established
field-atlas world:

- Warm mineral paper, deep teal ink, coral action, lichen support, stone rules,
  condensed display type, humanist reading type, and square field-sheet
  structure.
- One complete, purpose-built, text-free, static companion in reserved
  whitespace on an eligible surface.
- One closed `DecorativeCompanion` asset registry with explicit full-size and
  512-pixel sources, intrinsic dimensions, responsive source sets, loading
  policy, and failure collapse.
- Empty alternative text, assistive-technology hiding, disabled dragging, no
  focus target, and pointer-inert presentation.
- Complete removal in forced colors and unchanged static presentation under
  reduced motion.
- Content-first collapse whenever layout or application state needs the space.

The assets never communicate navigation, coaching, save state, workout state,
account identity, validation, progress, success, failure, private data, or
sample-data meaning. Adjacent semantic content remains complete without them.

## Asset registry, provenance, and cache classes

Retain the eight closed variants and their exact responsive WebP pairs:

| Variant | Asset role | Cache class |
| --- | --- | --- |
| `landing` | Planning hedgehog | Public install asset |
| `member-home` | Preparing fox | Owned-only asset |
| `progress-preview` | Reviewing raccoon | Public install asset |
| `library` | Cataloging otter | Public install asset because `/library` uses it |
| `routine-editor` | Routine-drafting beaver | Owned-only asset |
| `history` | History-archive tortoise | Owned-only asset |
| `settings` | Settings-packing hare | Owned-only asset |
| `workout` | Workout-corner bear | Owned-only asset |

Keep the PWA cache at the reviewed v6 boundary. Public Cache Storage may contain
only the explicit public routes, static framework assets, icons, contours, and
the hedgehog, raccoon, and otter pairs. It must not contain owned routes,
authenticated HTML or data, or the fox, beaver, tortoise, hare, or bear pairs.

Keep runtime WebPs under `public/illustrations/companions/`. Keep prompt,
transformation, dimension, and hash records under
`docs/design/provenance/`. Fetchable public directories must contain no JSON.
Every public provenance record and design sidecar must omit absolute local
paths, worktree paths, temporary paths, task identifiers, and generator
identifiers.

## Navigation and surface placement

Preserve all released navigation and route ownership. Add no route and move no
account, workout, history, settings, library, or program action.

- Public `/library`: keep the otter outside equipment, search, filter, and
  result controls. The route and decoded otter must remain usable offline.
- Member `/app/library`: reuse the otter only in broad heading whitespace.
  Member HTML, owned results, and private labels remain uncached.
- `/app/program/edit`: show the beaver only in a clean, neutral, broad heading
  state outside equipment review, topology, fields, validation, save status,
  chooser state, and removal review.
- `/app/history` and `/app/history/[sessionId]`: keep the tortoise outside
  filters, pagination, state labels, session facts, set/cardio rows, and notes.
- `/app/settings`: show the hare only for a verified, identity-ready member
  with no unsaved value, save status, failure, or deletion review.
- `/workout/[sessionId]`: show the bear only after recovery in an online,
  neutral, broad-width overview. Hide it for active logging, guidance, timers,
  pending or saved operations, notices, retry, offline, authentication,
  conflict, terminal, and navigation-protection states.

At 320, 390, and 430 CSS pixels, semantic product content wins. At 820 pixels,
art appears only when the reviewed surface contract reserves space. At 1,280
and 1,440 pixels, strict geometry must prove that every visible asset and every
protected product region both exist and do not overlap.

## Types, state, persistence, and authorization

Retain the pure visibility predicates as the only new state model. They may
consume presentation-safe booleans only. They must not accept a Firebase UID,
program ID, session ID, private label, workout value, account value, or data
record.

This integration adds no persistence. It does not change database types,
canonical units, schema, migrations, seeds, API request or response contracts,
repositories, ownership predicates, Firebase behavior, browser-storage
records, immutable workout or program revisions, analytics, guidance, or video
approval.

Server Components remain server-owned. The reusable companion stays a narrow
Client Component only because image failure needs local state. Importing the
leaf must not move route data reads or route modules into the client graph.

## Failure and concurrency recovery

- Image failure removes the complete decorative slot and its reserved track.
  The semantic route remains usable.
- Authenticated fixture staging copies only the exact maintained asset list.
  It uses a worktree-keyed exclusive lock, preserves pre-existing
  destinations, cleans only files created by the active attempt, and releases
  the lock after success, build failure, browser failure, or partial staging
  failure.
- Request cancellation exceptions require an allowlisted same-origin `GET`
  image or route resource, the exact cancellation class, and either detached
  or changed frame state or previously observed same-origin superseding
  main-frame navigation. Do not allow wildcard resources, cross-origin
  requests, mutation methods, generic navigation noise, or failures without
  bounded navigation evidence.
- Keep the documented WebKit `/contours.svg` cancellation as one exact
  teardown-only engine exception. Do not broaden the exemption or convert a
  product assertion failure into an engine note.

## Accessibility and interaction

Verify that each visible companion has `alt=""`, `aria-hidden="true"`,
`draggable="false"`, no accessible name, no role, no focusable descendant, no
focus-order position, and no pointer hit. Image failure and forced colors must
remove both the image and reserved track.

Verify keyboard navigation, visible focus, pointer targeting, safe-area
clearance, text wrapping, touch targets, dark and light themes, reduced motion,
forced colors, and no horizontal overflow. Automated checks and screenshot
review may identify accessibility risks, but only DOM, focus, geometry, and
browser evidence can support the implementation claims.

True native 200% evidence for public Library, member Library, and History must
prove a two-to-one device-pixel ratio, halved inner width,
`visualViewport.scale === 1`, no horizontal overflow, and content-first art
collapse. Keep CDP page-scale checks separate and do not relabel them as native
zoom.

## Integration method

1. Commit this plan on the exact base branch before source integration.
2. Merge the rollout tip as one reviewed source line so both source commits
   become ancestors exactly once and the pilot is not separately replayed.
3. Record conflicts or the absence of conflicts. Do not resolve a conflict by
   reintroducing a historical Wave 1 or Wave 2 branch.
4. Audit the exact integrated diff against the forbidden production-change
   boundary and the public-provenance rule.
5. Reconcile canonical Markdown first. Preserve historical Wave 3 pilot and
   rollout records while updating `STATUS`, `SOURCES`, the wiki, `DESIGN.md`,
   `design-qa.md`, this plan, and the Wave 4 QA report to integration truth.
6. Regenerate same-content HTML with the canonical documentation generator.
7. Retain only one coherent Wave 4 integration report and required screenshots
   under `docs/qa/latest/` after replacement evidence is verified.

## Verification and browser evidence

Run one bounded review, fix, and rebuild cycle. Do not hide a real failure,
weaken an assertion, or add a broad exception to make a matrix green.

Run the following gates on the exact integrated candidate:

- Strict TypeScript.
- Full ESLint.
- All Vitest suites with exact file and test totals.
- Read-only Drizzle metadata and complete schema/database verification.
- Deterministic seed policy check without applying a seed.
- Generated PWA and service-worker parity.
- Live Chromium offline public Library proof, including decoded otter and
  Cache Storage exclusion for every owned route and owned-only companion.
- Canonical Markdown generation and HTML parity.
- Next.js 16.3.2 production Webpack build.
- Production route-boundary verification.
- Complete maintained public Chromium/WebKit matrix.
- Complete maintained authenticated Chromium/WebKit phone, tablet, and desktop
  matrix.
- Rollout-specific public matrix.
- Rollout-specific authenticated matrix.
- Firebase Admin serverless compatibility regression.
- `pnpm why jose` with the resolved `jwks-rsa>jose` boundary recorded.
- Git whitespace, generated-artifact, privacy, and exact-diff checks.

The risk review must explicitly cover:

1. Public `/library` route and otter offline-cache proof.
2. Owned routes and private companion assets absent from public Cache Storage.
3. Same-origin, method, cancellation-class, and navigation-evidence-bounded
   request cancellation.
4. Failure- and concurrency-safe authenticated fixture staging.
5. Settings dirty-state collapse.
6. Runner neutral-state-only visibility.
7. Overlap, accessibility-tree, focus, pointer, target, and overflow safety.
8. True native 200% public Library, member Library, and History proof.
9. The exact WebKit `/contours.svg` teardown cancellation and the focused
   WebKit phone replay of 22 passes and four intentional skips.

Use the newest current-run screenshots as audit evidence. Open and inspect each
retained image before accepting it. Tie UX and accessibility findings to the
specific step or screenshot that proves them. Do not claim complete WCAG
conformance from screenshots.

## Independent reviews

After the integrated candidate is stable, run two independent bounded reviews:

- An integration audit with no permission to edit. It checks the exact diff,
  cache/privacy boundary, fixture staging, cancellation policy, state
  predicates, native zoom, accessibility and interaction evidence, forbidden
  production changes, documentation truth, and QA retention.
- A fresh finish review with no inherited implementation narrative. It inspects
  the current-run screenshots, comparison evidence, changed UI, and test
  results, then returns one disposition: `fix`, `recapture`, `rebuild`, or
  `ship`.

Apply at most one coherent correction batch when a material issue is found,
then rebuild and rerun affected gates once. Record unresolved failures as
release blockers.

## Acceptance criteria

- Exact base, source tips, remote tips, and linear ancestry are proved.
- The rollout lineage is integrated once, with no separate pilot duplication.
- The final diff contains no forbidden production change.
- All eight assets retain verified hashes, closed registry entries, responsive
  source pairs, and correct public or owned cache class.
- Public provenance exposes no absolute local path or generator identifier.
- Settings and runner visibility remain fail-closed.
- Public offline Library and private-cache exclusion pass live browser proof.
- Fixture staging and cancellation policies pass focused and complete tests.
- Complete local gates report exact totals and intentional skips.
- The exact WebKit teardown exception remains bounded and the 22/4 focused
  replay remains green or is rerun and reported honestly.
- Current-run visual evidence confirms responsive, native-zoom, non-overlap,
  accessibility, focus, and pointer behavior with no material finding.
- Canonical Markdown and generated HTML are byte-consistent.
- `docs/qa/latest/` contains one coherent Wave 4 integration evidence set.
- The branch is committed, pushed, clean, and byte-identical to its upstream;
  exact base and source commits are ancestors of the integration tip.

## Closeout record

Update this section after verification with the exact integration tip,
conflicts, asset hashes, cache classes, reviewer dispositions, gate totals,
skips, engine-only exception, retained QA paths, local/upstream equality, and
release blockers.
