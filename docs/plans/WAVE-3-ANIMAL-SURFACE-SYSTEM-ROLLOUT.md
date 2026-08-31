# Wave 3 animal surface-system rollout plan

## Outcome and branch boundary

Roll the approved Corner Companions surface system from the verified pilot into
the remaining maintained product surfaces:

- Guest and member exercise Library where the layout has safe reserved space.
- The owned routine editor.
- History and immutable workout detail.
- Settings.
- The owned workout route and active runner at unconstrained widths and states.

The rollout branch is `vishal/pal-visual-rollout`. It starts from exact approved
pilot tip `b4499f3b953a5745039f1bca67da68e6e135c7c3`, which is also the exact tip
of `origin/vishal/pal-visual-pilot`. The pilot finish-review disposition is
`ship`, and this rollout must preserve every pilot surface and asset without
regression.

This iteration does not merge `main`, deploy, change a provider, alias,
environment variable, or billing setting, apply or add a production migration,
seed production, change production data, remove a sibling worktree, or begin
Wave 4 integration or release work.

## Product and visual truth

The sole visual direction is the approved Corner Companions board at
`.impeccable/mocks/companion-concepts/corner-companions-board.png`, together
with the passed pilot captures and the generated system record in `DESIGN.md`.
The board remains uncropped design evidence and never becomes a runtime asset.

The rollout is an extension of the established field-atlas world, not another
identity round. Preserve the following system:

- Warm mineral paper, deep teal ink, coral action, lichen support, stone rules,
  condensed display type, humanist reading type, and square field-sheet
  components.
- One complete, purpose-built, text-free, static animal vignette in reserved
  whitespace on an eligible surface.
- A single reusable `DecorativeCompanion` component, closed variant registry,
  shared tokens, explicit asset paths, intrinsic dimensions, responsive
  sources, and one failure-collapse boundary.
- Empty alternative text, assistive-technology hiding, no focus target, disabled
  dragging, and pointer-inert presentation.
- Complete removal in forced colors, unchanged static presentation in reduced
  motion, and content-first collapse on constrained states.
- Explicit public-cache inclusion only for assets that a public route uses.
  Authenticated HTML, owned data, and owned-only assets remain outside the
  service-worker cache.

The animal never becomes navigation, coaching, status, validation, progress,
save feedback, error recovery, account identity, or data. Adjacent semantic
content always carries the complete product meaning.

## Surface placement contract

The following table defines the maximum rollout. Browser evidence may require a
smaller visible boundary when a surface lacks safe space, but it cannot move art
into the task or data plane.

| Surface | Placement | Required collapse | Cache class |
| --- | --- | --- | --- |
| Guest Library `/library` | A quiet slot in the introductory field above the tools, separate from equipment and search controls | Collapse below the measured tablet threshold, in no-result recovery when the slot would displace search, on image failure, and in forced colors | Public route asset; explicit public-cache allowlist |
| Member Library `/app/library` | Introductory field beside the title at broad widths, never beside private result labels or the create/search controls | Collapse on phone and narrow tablet, for loading or route failure, on image failure, and in forced colors | Reuse the public Library asset only if it is contextually correct; no member HTML or data cache |
| Routine editor `/app/program/edit` | Broad hero whitespace only, outside equipment review, the day outline, topology controls, fields, validation, publish status, removal review, and chooser | Collapse below desktop, while a destructive review is open, while saving, after validation failure, during failed or reconciliation status, on image failure, and in forced colors | Owned-only asset or a contextually correct existing pilot asset; no public-cache addition |
| History `/app/history` | Introductory whitespace outside filter controls and immutable session rows | Collapse below desktop, in empty/filter-empty/loading/failure states when content needs the space, on image failure, and in forced colors | Owned-only asset; no public-cache addition |
| History detail `/app/history/[sessionId]` | Reuse the History visual only when broad heading whitespace remains outside saved state and log data | Collapse whenever the header, state label, or detail content would compete; never place art inside exercise, set, cardio, or note records | Owned-only asset; no public-cache addition |
| Settings `/app/settings` | Introductory whitespace above preferences and separate from all account controls | Collapse below desktop, while saving or failed, for unverified restrictions, whenever deletion review is open, on image failure, and in forced colors | Owned-only asset; no public-cache addition |
| Workout `/workout/[sessionId]` | Broad runner-header whitespace only after device/server recovery succeeds | Collapse at phone and tablet widths and whenever recovery, verification, pending, saved, failed, retry, conflict, offline, auth, timer, terminal, or navigation-protection state needs priority | Owned-only asset; no public-cache addition |

At 320, 390, and 430 CSS pixels, product content wins and rollout art may be
absent. At 820 CSS pixels, each surface must prove that a visible companion has
real reserved space; otherwise it collapses. At 1,280 and 1,440 CSS pixels, the
art may appear only when strict non-overlap checks pass.

## Asset inventory and production

Before generation, measure the final slot at each visible breakpoint and run an
independent asset-manifest review. Reuse pilot art only when the action and
composition fit the new surface without implying product state:

- The planning hedgehog remains landing-only unless a fresh side-by-side
  comparison proves that its blank notebook is a faithful routine-editor
  planning context and that the measured hero slot can use the full uncropped
  composition. The audit hypothesis alone is not permission to reuse it.
- The preparing fox remains tied to preparation. Do not reuse it where tying a
  shoe would misrepresent history, settings, or an active runner.
- The reviewing raccoon remains tied to a disclosed guest preview. Do not reuse
  its marked paper where the marks could be mistaken for private history or
  member analytics.

Generate purpose-built assets for every remaining row whose existing art fails
that contextual test. Candidate production briefs are:

| Asset role | Subject and action | Semantic exclusions |
| --- | --- | --- |
| Library | A friendly animal calmly browsing a blank field guide or unmarked index cards, with usable side whitespace | No lettering, search term, filter, category badge, recommendation, approval mark, or navigation cue |
| History | A calm animal filing a closed blank folder beside a small archive box | No dates, session facts, completion mark, trend, chart, personal record, or success signal |
| Settings | A calm animal arranging a plain towel and closed water bottle beside a gym tote | No toggle, account icon, gear icon, identity, provider mark, warning, deletion cue, or validation state |
| Workout | A calm animal standing aside with a plain towel and closed bottle, ready but not instructing | No exercise demonstration, timer, coaching gesture, weight, repetition, saved state, finish cue, warning, or celebration |

Settings and workout are named rollout outcomes, not optional omissions. Give
each a purpose-built, noncritical desktop/tablet heading or whitespace slot and
test the slot before considering an exception. The Settings slot must remain
outside verification, input, save/error, and deletion controls. The workout
slot may appear only in a safe stable overview/header state and must disappear
on phones and during active logging, timers, guidance, recovery, offline,
error, reconciliation, retry, and terminal states. If measured evidence proves
that even those slots are unsafe, record a surface-specific exception with the
failed measurements and require the fresh finish reviewer to judge whether the
rollout still satisfies this plan; do not silently omit either surface.

Every generated image must use the original hand-inked golden-age theatrical
cartoon language and the approved palette. It must contain one complete
uncropped character, no text, no logo, no copied character, no real person, no
private data, no chart, and no semantic UI symbol. Prefer genuine transparency.
An opaque bounded paper field is acceptable only after direct light/dark review
proves that transparency or edge extraction cannot meet the quality gate.

Save shipping WebP files and 512-pixel responsive derivatives under
`public/illustrations/companions/`. Preserve the exact generation prompt in a
private-safe same-basename JSON record under
`docs/design/provenance/companions/` and in the rollout asset inventory. Record
the safe transformation description, final dimensions, and final SHA-256, but
do not publish absolute local paths or generator identifiers. Fetchable public
asset directories contain WebPs only. Reject and remove baked checkerboards,
halos, color-key fringes, cropped limbs or props, lettering, data-like marks,
and abandoned variants.

## Component, types, and styling

Extend the closed `COMPANION_ASSETS` registry rather than adding a second
component or page-specific background CSS. Each new variant defines its source,
responsive source set, intrinsic dimensions, loading priority, fetch priority,
and `sizes` contract.

The component retains one client boundary because image failure uses local
state. Server pages stay Server Components. Existing client surfaces import the
same leaf component without moving data reads or whole routes into the client
bundle.

Add shared rollout tokens for broad-slot width, safe gap, and compact collapse.
Host selectors may place a variant, but they cannot redefine image semantics,
failure behavior, or a page-specific background image. Host `:has([hidden])`
and forced-color rules must collapse the relevant grid track without a blank
gap. No CSS art, emoji, inline illustration, handmade SVG animal, rasterized UI
text, gradient decoration, glow, glass, or shadow belongs to the rollout.

## State, persistence, and authorization

This rollout changes presentation only. It adds no database type, schema,
migration, API request or response, mutation, Firebase behavior, browser-storage
record, ownership key, workout operation, analytics calculation, unit
conversion, guidance record, exercise-video rule, or program revision behavior.

Preserve the following state authority:

- Search and filter inputs remain the Library authority.
- Routine controls, validation summary, saved/failed/retry feedback, equipment
  review, publication status, and destructive dialogs remain the editor
  authority.
- Immutable session rows and workout-detail snapshots remain the History
  authority.
- Native fields, text save status, sign-out, reauthentication, and deletion
  review remain the Settings authority.
- Recovery, progress, operation state, offline/auth notices, timers, logging
  fields, conflict resolution, retry controls, and terminal actions remain the
  runner authority.

The component may render only after the existing server-derived owner boundary
has selected a member surface. It never accepts or renders a Firebase UID,
program ID, session ID, private label, workout value, or account state.

## Public cache and privacy

Add only the final Library asset and its 512-pixel derivative to the public
install/static allowlists because `/library` truly references them. Do not add
editor, History, Settings, or workout assets. Keep `/app`, `/workout`, private
APIs, authenticated HTML, member navigation, owned results, history, settings,
runner data, and arbitrary images outside the service worker.

The generated service worker must stay byte-identical to the canonical cache
policy. Offline browser evidence must prove that cached public Library HTML and
its explicit art work without a network, while the member Library, History,
Settings, workout route, and owned-only art remain absent from the public cache.
If a public art request fails, the cached Library stays usable and the slot
collapses.

## Responsive, accessibility, and interaction requirements

Verify 320, 390, 430, 820, 1,280, and 1,440 CSS-pixel widths, plus both Chrome
DevTools Protocol page scale and true native 200% browser zoom/reflow. Extend
the retained headed native-zoom record from the pilot to Library and History;
do not label a halved CSS viewport or CDP page scale as native zoom proof.
Compare against the same-state reference density used by the pilot.
At every size:

- Reject horizontal document overflow.
- Keep headings, search, filters, inputs, topology controls, destructive review,
  immutable data, account controls, guidance players, timers, logging controls,
  notices, terminal state, and fixed navigation outside the companion box.
- Fail strict geometry assertions when either participant is missing instead of
  treating absence as non-overlap.
- Let long names and status text wrap without entering the art slot.
- Keep all interactive targets and fixed navigation above safe-area boundaries.

Verify light and dark themes, forced colors, reduced motion, keyboard, pointer,
and screen-reader semantics. Every companion must have `alt=""`,
`aria-hidden="true"`, `draggable="false"`, no focusable descendant, and
`pointer-events: none`. Accessibility-tree snapshots, focus traversal, and
pointer hit-testing must prove that the asset has no accessible name, focus
position, role, or click target. Image failure and forced colors remove both the
image and reserved track.

## Test-driven implementation

Retain a meaningful failed-before checkpoint before component, route, cache,
fixture, or CSS implementation. The focused RED contract must cover:

- The expanded closed variant registry and exact asset paths.
- Decorative, pointer, focus, and accessible-name semantics for every variant.
- Required route/component placements and explicit forbidden placements.
- Content-first collapse policies for phone, state-critical editor/Settings,
  and runner states.
- Public-cache inclusion for only the Library asset and exclusion for every
  owned-only asset and private route.
- Authenticated fixture parity without broadening scenario or owner headers.
- Exact authenticated fixture copies for only the new asset filenames that its
  maintained member routes render, plus exact canceled-image allowlist entries.
  Do not use a broad companion-directory copy or wildcard request exception.
- Image-failure, forced-color, reduced-motion, and host-grid collapse source
  policy.

Run the exact focused command before implementation and preserve the failing
assertion names and exit status in the final QA record. After implementation,
run the identical command GREEN before broader checks. Expand existing tests
where they own the contract instead of creating duplicate policy suites.

## Browser and design evidence

Extend the production-mode pilot harnesses with a rollout-specific matrix.
Public coverage includes guest Library complete, search-result, no-result,
image-failure, forced-colors, reduced-motion, dark, keyboard, pointer,
accessibility, offline, and 200% zoom states.

Authenticated synthetic coverage includes member Library complete/no-result,
editor clean/dirty/validation/saving/failure/removal-review, History
empty/populated/filter-empty/detail, Settings loaded/unverified/saving/saved/
failed/deletion-review, and workout recovery/ready/pending/saved/failed/retry/
offline/auth/conflict/timer/terminal states. Companion visibility is asserted
only where the contract permits it; every critical state proves collapse.

For every visible companion, pair strict non-overlap checks with protected
selectors from the maintained surface: Library search/filter/results and create
control; editor equipment/topology/fields/errors/status/dialogs; History
filter/rows/detail state/archive data; Settings inputs/status/account/deletion;
and runner identity/progress/notices/guidance/timer/logging/retry/footer. Also
assert no accessible name or role, no focus-order entry, and no pointer hit.

Run Chromium and WebKit phone, tablet, and desktop projects. Capture valid,
privacy-safe rollout evidence at 390, 820, and 1,440 CSS pixels, plus any
additional 320, 430, 1,280, and 200% proof required by the rollout matrix. Open
every retained image and reject blank, stale, half-loaded, wrong-state, or
misnamed captures.

For Product Design QA, combine the uncropped selected board or passed pilot
reference with each same-state rollout capture in one comparison image. Evaluate
typography, spacing, tokens, image quality, content, states, responsiveness,
accessibility, and prohibited semantic competition. Update project-root
`design-qa.md` only after the latest comparison has no actionable P0, P1, or P2
finding and records `final result: passed`.

After the bounded implementation inspection, run the Impeccable manual detector
exactly once over changed UI targets. Fix mechanical findings in one batch and
pass all remaining findings to a fresh finish reviewer with no inherited
conversation context. Follow only its bounded `recapture`, `rebuild`, `fix`, or
`ship` disposition. Run the shipped Impeccable documenter after the final
correction and update `DESIGN.md`, its sidecar, and the rollout surface record
to describe shipped ground truth.

## Complete verification

Run the following gates after focused GREEN and visual review:

- Focused and full Vitest.
- Strict TypeScript.
- Full ESLint.
- Drizzle metadata and complete schema tests.
- Deterministic seed policy checks without applying a seed.
- Generated service-worker parity and Chromium public-offline behavior.
- Generated Markdown/HTML documentation parity.
- Next.js 16.3.2 Webpack production build.
- Production route-boundary check.
- Complete maintained public Chromium/WebKit matrix.
- Complete maintained authenticated Chromium/WebKit phone, tablet, and desktop
  matrix.
- Rollout-specific public and authenticated browser evidence.

Report every complete gate as a rollout delta from the reviewed pilot baseline
of 123 Vitest files and 839 tests. A changed total is not itself a regression,
but the report must separate newly added coverage from any removed or skipped
pilot coverage.

Run only one production build or browser matrix at a time. Measure task-owned
artifact directories and available disk space around large gates. After the
replacement evidence passes, retain only the newest privacy-safe Wave 3 report
and required desktop/mobile captures. Remove superseded generated evidence,
`.next`, authenticated fixture build output, Playwright reports, traces, and
test results without touching unrelated caches or sibling worktrees.

## Documentation and closeout

Update the plan execution record, `docs/context/STATUS.md`,
`docs/context/SOURCES.md`, `docs/wiki/index.md`, `DESIGN.md`, `design-qa.md`, and
their generated HTML counterparts with verified rollout facts. Preserve the
pilot record as intentional history and distinguish pilot proof from rollout
proof.

Commit and push `vishal/pal-visual-rollout`. Leave the worktree clean and report
the exact base and tip, asset files and SHA-256 values, prompts and provenance,
reviewer disposition, test commands and results, retained screenshots,
public-cache inclusion, owned/private exclusion, privacy proof, and open risks.
Stop before merge, deployment, production data, provider, environment, billing,
sibling-worktree, or Wave 4 work.

## Execution record

- Base preflight: clean detached checkout at exact pilot tip
  `b4499f3b953a5745039f1bca67da68e6e135c7c3`; local and remote pilot refs
  resolve to the same SHA.
- Branch preflight: `vishal/pal-visual-rollout` created at the exact pilot tip.
- Required instructions: repository and global `AGENTS.md`, project context,
  local Next.js 16.3.2 Server/Client Component, CSS, image, and error guides,
  Impeccable, Product Design image-to-code and design-QA, image generation,
  Playwright, and technical-writing instructions read before implementation.
- Impeccable context: the established world, comp build path, manual-detector
  boundary, available `cwebp`, `sips`, and `ffmpeg` converters, and stale
  generated design sidecar were identified. The final documenter owns the
  sidecar refresh after the last rollout correction.
- Product Design context: no saved Product Design user-context file exists, so
  the approved repository board, passed pilot captures, tokens, components, and
  current source are the visual authority.
- TDD RED: `node node_modules/vitest/vitest.mjs run
  tests/unit/decorative-companion.test.tsx
  tests/unit/animal-surface-rollout.test.ts --configLoader runner` failed before
  implementation because the five rollout variants, shared state predicates,
  route placements, collapse CSS, and Library cache entries did not yet exist.
  The retained console evidence showed the absent closed-registry keys, missing
  `@/domain/companions/visibility`, and missing rollout collapse selector.
- TDD GREEN: the closed registry now contains `library`, `routine-editor`,
  `history`, `settings`, and `workout`; shared pure predicates own Settings,
  editor, and runner eligibility; and focused unit, component, cache, staging,
  cancellation, provenance, and documentation-policy coverage passes before the
  complete suite.
- Asset result: five original full/512 pairs ship—cataloging otter, routine-
  drafting beaver, history-archive tortoise, settings-packing hare, and workout-
  corner bear. Exact prompts, dimensions, safe transformations, and hashes live
  under `docs/design/provenance/companions/`. Rejected checkerboard, obscured-
  foot, and wrong-subject candidates were not retained.
- Implementation result: public/member Library, owned editor, History
  list/detail, Settings, and runner all use `DecorativeCompanion`; no page-
  specific animal background CSS was introduced. Settings now collapses on any
  unsaved preference edit. Runner remains visible only in a recovered, online,
  neutral broad-width overview and collapses for every constrained or critical
  state.
- Semantic result: explicit protected selectors across all rollout surfaces
  require non-overlapping bounding boxes. Empty alternative text,
  `aria-hidden`, no accessible name, no focus target, disabled dragging, and
  pointer hit-testing keep every companion outside product meaning and input.
- Fixture result: authenticated staging copies only the exact 12 required
  assets behind a SHA-keyed lock, preserves pre-existing destinations, and
  cleans only attempt-created files after success or partial failure. Request
  cancellation exemptions require an allowlisted same-origin GET image, the
  exact cancellation class, and a changed/detached frame or already-observed
  same-origin superseding main-frame navigation.
- Cache/privacy result: only the cataloging-otter full/512 pair joins the public
  cache for public `/library`. Runtime offline proof decodes the otter after an
  offline reload and confirms all fox, beaver, tortoise, hare, bear, owned
  routes, authenticated HTML, and private data remain absent. All fetchable
  public illustration directories are free of provenance JSON; companion and
  hero records were moved to `docs/design/provenance/` and scrubbed of private
  local paths and generator identifiers.
- Responsive result: automated browser coverage spans 320, 390, 430, 820, 1280,
  and 1440 CSS pixels in maintained Chromium/WebKit phone, tablet, and desktop
  projects. CDP page scale remains explicitly separate from true headed native
  200% proof for public Library, member Library, and History.
- Visual review: the manual Impeccable detector ran exactly once. Its broad
  output identified only pre-existing monolithic-CSS and design-scale
  advisories outside the rollout block. The fresh finish reviewer requested one
  bounded Settings dirty-state correction, accepted the refreshed desktop,
  phone, and uncropped comparison evidence, confirmed every integration-audit
  item, and issued final disposition `ship` with no material finding.
- Documentation result: the final documenter refreshed `DESIGN.md` and
  `.impeccable/design.json` after the last correction. `design-qa.md`, context,
  sources, wiki, this execution record, and the newest Wave 3 QA report have
  generated HTML parity. Superseded pilot/Wave 2 evidence was removed from
  `docs/qa/latest/`; only the coherent rollout report and 23 privacy-safe
  captures/comparisons remain.
- Verification result: 127 Vitest files/860 tests pass, a delta of four files
  and 21 tests from the pilot baseline. TypeScript, full ESLint, Drizzle/schema,
  seed, service-worker, documentation, production Webpack build, and the
  44-entry production route boundary pass. The complete public matrix is 90
  passed/42 intentional skips across 132 cases. The time-boxed final
  authenticated matrix completed 54 passes/13 intentional skips across 68
  cases plus one engine-only WebKit cancellation of `contours.svg` during
  teardown with no failed product assertion. Immediately before it, the full
  WebKit phone project passed 22/4, including the same routine and every
  rollout/resilience journey; the other five projects were green in the final
  matrix.
- Independent closeout result: a fresh reviewer inspected the retained capture
  set and all eight integration-audit verdicts after the final hardening. It
  accepted the isolated WebKit teardown cancellation as engine-only noise,
  found no material product or security defect, and retained `ship`.
- Boundary result: no merge, deployment, provider, alias, environment, billing,
  migration, production seed/data, sibling-worktree, or Wave 4 action occurred.
