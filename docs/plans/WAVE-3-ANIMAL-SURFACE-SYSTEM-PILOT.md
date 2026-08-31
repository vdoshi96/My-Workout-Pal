# Wave 3 animal surface-system pilot plan

## Outcome and boundary

Implement the selected Corner Companions direction on three surfaces only:

- Guest landing at `/`.
- Signed-in personal home at `/app` after an active routine exists.
- Guest Progress preview at `/progress`.

The pilot starts from exact clean `main` commit
`298cb04b8b16ad6c3586ef74bc95df7301533472` on branch
`vishal/pal-visual-pilot`. It doesn't merge `main`, deploy, change providers,
apply or add a migration, seed production, remove sibling worktrees, or begin a
broader visual rollout.

Preserve every Wave 2 route, account, routine, workout, guidance, analytics,
service-worker, and authorization behavior. The animal system remains
decorative and cannot communicate account state, saved state, workout state,
sample-data meaning, progress, success, coaching, or navigation.

## Visual source and production corrections

Use
`.impeccable/mocks/companion-concepts/corner-companions-board.png` as the exact
selected composition target. Its prompt and JSON sidecar define the approved
golden-age theatrical cartoon language, warm mineral paper, deep teal-blue ink,
coral action, lichen support, ruled structure, and restrained character scale.
`docs/design/COMPANION-VISUAL-CONCEPTS.md` defines the production contract.

The board is evidence only. Never ship it, crop it, or extract characters from
it or from the composite gym hero. Generate three original, text-free
production vignettes. Prefer transparent cutouts; an intentionally bounded,
source-faithful warm-paper field is acceptable when true-alpha generation or
edge extraction cannot meet the dual-background quality gate:

| Surface | Production vignette | Required composition |
| --- | --- | --- |
| Guest landing | Planning hedgehog | Full-body planning pose with a blank notebook and pencil; no lettering, logo, numbers, or progress signal |
| Signed-in home | Preparing fox | Full-body seated preparation pose tying a shoe beside a bench and water bottle; no workout status or completion cue |
| Guest Progress preview | Reviewing raccoon | Full-body calm review pose holding an unlabeled paper with nonsemantic marks only; no upward arrow, personalized data, numbers, or completion cue |

Save the shipping assets under `public/illustrations/companions/` as WebP files.
Give each file an exact prompt sidecar and embedded prompt
provenance. Keep the generation source outside the repository after verified
conversion. Do not add generated lettering, private data, real people, copied
characters, emoji, CSS art, handmade SVG art, or text glyph substitutes.

Production copy keeps the guest page title **Progress**, not **See your
progress**. Every illustrated paper or notebook remains text-free.

## Reusable component and tokens

Add one reusable decorative companion placement component rather than
page-specific background images. The component owns:

- A closed surface-variant type for `landing`, `member-home`, and
  `progress-preview`.
- The public asset path, intrinsic dimensions, responsive `sizes`, and shared
  placement classes for each variant.
- Empty alternative text, `aria-hidden="true"`, `draggable={false}`, and
  pointer-inert behavior.
- A client-side image-failure boundary that removes the entire reserved slot so
  a broken image leaves no icon, alternative text, or layout gap.

Add shared companion tokens for the slot width, mobile height, desktop gutter,
and safe spacing. Keep these tokens separate from route-specific content and
reuse them across all three surfaces. The assets are ordinary static images,
not backgrounds behind text or interactive controls.

## Surface composition

### Guest landing

Recompose only the first viewport to match the selected board's hierarchy:

- Keep the existing public header, navigation destinations, protected account
  entry, and identity-neutral cache behavior.
- Lead with **Your workout. Your way.** and the truthful planning, guidance,
  logging, and progress promise.
- Keep the five-day starter example secondary and explicitly unsaved.
- Keep both existing account and public exploration paths available.
- Place the planning vignette in a reserved side slot on desktop and a
  dedicated content slot after the actions on phone.

Prove this viewport before changing the later surfaces. Capture the browser at
the board's 1,536 by 1,024 pixel size and at the board frame's 1,440 by 1,024
CSS-pixel size. Save the required Impeccable checkpoint as
`.impeccable/review/hero-repro.png` only after the visible hierarchy, scale,
spacing, palette, and vignette placement hold against the selected board. That
pilot checkpoint is historical at reviewed source
`b4499f3b953a5745039f1bca67da68e6e135c7c3` and is not retained in the newest-
only current QA directory.

### Signed-in personal home

Preserve the existing server-derived viewer, account rail, identity,
verification state, sign-out, active-program read, resumable-workout priority,
empty progress, routine actions, equipment control, and owner-only data.

Place the preparation vignette inside the personal-home content plane only. On
desktop, reserve whitespace beside the welcome and next-action region without
entering the account rail. On phone, place the art in a dedicated slot after
the personal action content and before the next semantic section. The art
cannot cover routine links, progress totals, verification notices, resume
actions, equipment controls, errors, or fixed navigation.

Do not add the vignette to public HTML, the service-worker cache, onboarding,
route loading, or route error markup. Those states remain semantic and compact.

### Guest Progress preview

Preserve exactly one visible **Sample data · not your history** disclosure,
ordinary metric labels, the history list, the accessible chart description,
the sample-workout action, and canonical `/progress` navigation.

Place the calm review vignette outside the disclosure, metrics, chart, and
history data plane. Desktop uses reserved whitespace beside the introductory
content. Phone uses a dedicated slot after the core preview content and before
the action when enough space remains. The slot collapses without a gap when the
image is hidden or fails.

## State contract

The pilot must preserve the following truthful states:

| State | Required behavior |
| --- | --- |
| Guest | Public navigation and unsaved example remain available; no account or persistence claim |
| Authenticated and verified | Server-derived identity and sign-out remain visible; owned routine and next action remain primary |
| Authenticated and unverified | Read-only notice and verification requirement remain visible; permanent actions stay unavailable |
| Empty progress | No sample values enter the personal home; first completed workout remains the source of private progress |
| Active workout | Resume remains dominant; competing day-start links stay unavailable |
| Loading or slow read | Polite busy status describes the reads; decorative art doesn't delay or replace it |
| Route failure | Alert says personal data didn't load and no change was made; retry remains reachable |
| Image failure | The whole decorative slot collapses; all meaning, controls, disclosure, chart, and navigation remain |
| Offline public route | Landing and Progress HTML plus their exact public companion assets remain available from the public-only cache |

## Persistence, authorization, caching, and privacy

This pilot adds no database type, API contract, mutation, browser-storage
record, Firebase behavior, or private cache. Server-derived ownership remains
unchanged.

Precache only the landing and Progress vignettes as explicit public assets.
Keep the signed-in-home vignette outside the service-worker allowlist so the
worker never associates it with private route handling. All three rasters are
generic, contain no identity or workout data, and remain independent from
private HTML. `/app`, private APIs, and owned data remain `no-store` and outside
the service worker.

If a public companion asset is unavailable offline, the component collapses
and the cached semantic route still works. If the service worker fails, normal
network browsing remains unchanged.

## Responsive, accessibility, and motion requirements

Verify widths of 320, 390, 430, 820, 1,280, and 1,440 CSS pixels, plus the
1,536 by 1,024 board proof and 200% browser zoom. At every size:

- Keep text and actions above phone fixed navigation.
- Prevent horizontal overflow and overlap with account chrome, controls,
  charts, disclosures, errors, timers, and navigation.
- Let long names wrap without placing decorative art in their reading region.
- Keep the art secondary to the heading and primary action.

Verify light and dark themes, forced colors, and reduced motion. In forced
colors, hide the entire companion slot with `display: none` so no gap remains.
Reduced motion keeps the static image unchanged and suppresses existing motion
as before. Text contrast, focus indicators, and control targets remain at the
released thresholds.

Keyboard and screen-reader checks must prove that decorative images are absent
from the accessibility tree and focus order. Pointer checks must prove that the
slot can't intercept clicks or taps. The component must render `alt=""`,
`aria-hidden="true"`, and pointer-inert CSS in every variant.

## Test-driven implementation

Retain meaningful failed-before and passed-after evidence for:

- The closed companion asset and placement contract.
- Decorative semantics and pointer-inert markup.
- Image failure removing the full slot.
- Forced-colors and reduced-motion source policy.
- Landing composition and the text-free planning asset.
- Personal-home placement across ready, unverified, empty, and active-workout
  states without changing action truth.
- Neutral Progress copy, one sample disclosure, and art outside the data plane.
- Public-cache inclusion for landing and Progress assets and exclusion for the
  signed-in asset and private route.
- Authenticated fixture asset copying without broadening its environment or
  ownership behavior.

Run focused RED tests before implementing the component or page changes.
Record the exact failing assertions and exit status in the final QA report.
After implementation, run the same files green before broader checks.

## Browser and design evidence

Use the maintained production-mode Chromium and WebKit harnesses. Add a bounded
pilot matrix that captures only privacy-safe public states and synthetic
authenticated fixture states.

The public evidence covers:

- Guest landing and Progress at every required width.
- 200% zoom, dark mode, forced colors, reduced motion, keyboard, pointer, Axe,
  horizontal overflow, image failure, and Chromium offline replay.
- Exact no-overlap checks between the decorative slot and headings, actions,
  disclosure, metrics, chart, and fixed navigation.

The authenticated evidence covers verified ready, unverified read-only, empty
progress, active-workout, image-failure, and responsive home states in
Chromium desktop and WebKit phone. It uses synthetic fixture owners only and
retains no private identity or data.

For Product Design QA, open the source board and each same-state browser
capture, combine the reference and implementation in one side-by-side image,
and evaluate typography, spacing, colors, image quality, copy, responsive
translation, and accessibility. Keep the final project-root `design-qa.md` with
`final result: passed` and retain the side-by-side evidence it cites.

After the bounded two-round visual inspection, run the manual Impeccable
detector once over changed UI targets. Then run the shipped finish reviewer in
fresh context with the selected board, direction contract, detector findings,
all required desktop and mobile captures, and the craft-floor reference. Apply
only its bounded recapture, rebuild, or fix protocol. Run the shipped
documenter after the last correction.

## Complete verification and closeout

Before branch closeout, run:

- Focused and complete Vitest suites.
- Strict TypeScript and ESLint.
- Drizzle and seed checks to prove the visual pilot didn't change data
  contracts.
- Generated documentation and HTML parity.
- Generated service-worker parity and Chromium offline behavior.
- Supported Next.js 16.3.2 Webpack production build and route-boundary check.
- Maintained public Chromium/WebKit release matrix.
- Maintained authenticated Chromium/WebKit responsive matrix.
- Pilot-specific responsive and design evidence.

Keep only the newest privacy-safe QA report and required comparison screenshots
under the project's QA evidence boundary. Remove generated build, trace,
Playwright report, and superseded screenshot artifacts after verification.

Commit and push `vishal/pal-visual-pilot`. Leave its worktree clean and report
the exact base, tip, asset paths, prompts and provenance, screenshots, test and
browser results, finish-review verdict, design-QA result, and open risks. Stop
before merge, deployment, provider changes, production data work, sibling
worktree cleanup, or rollout.

## Execution record

- Base and branch preflight: exact clean public/local `main`
  `298cb04b8b16ad6c3586ef74bc95df7301533472`; branch
  `vishal/pal-visual-pilot` created at that commit.
- Impeccable context: ran exactly once against the selected board; reported the
  manual detector requirement, incumbent-world documentation gap, and available
  raster tools. Configured the explicitly selected `comp` build path.
- Focused RED: `node node_modules/vitest/vitest.mjs run
  tests/unit/decorative-companion.test.tsx tests/unit/landing-page.test.tsx
  tests/unit/public-progress-page.test.tsx
  tests/unit/member-program-home.test.tsx
  tests/unit/pwa-cache-policy.test.ts
  tests/unit/authenticated-harness-policy.test.ts --configLoader runner`
  exited 1 before component or surface implementation. The missing reusable
  component plus eight intended placement, public-cache, and authenticated
  fixture assertions failed; 31 pre-existing assertions remained green. A
  preceding `pnpm exec` attempt was a non-product package-manager refusal to
  purge the linked dependency tree and is not counted as RED evidence.
- Focused GREEN: after adding the closed three-variant component, surface
  placements, failure/forced-colors/reduced-motion policies, public-cache
  allowlist, and bounded fixture copy, the identical direct Vitest command
  exited 0 with 44 of 44 assertions passing. The generated service worker was
  refreshed from its canonical TypeScript policy immediately before the run.
- Final focused regression: the expanded seven-file suite passed 46 of 46
  assertions after adding route loading/error coverage and the authenticated
  harness state contract.
- Assets: three purpose-built, text-free vignettes and responsive 512-pixel
  derivatives ship with exact prompt/provenance sidecars. The final hashes are
  hedgehog `79891bacacde49d7aeff0ad647d1e62a41fb68f56f5d7cbab937c58bfadbb126`
  and `45995ea9cd380bb344dda92decbe45c00ff66285b6e5e32872b97115528da79b`,
  fox `9812c7a337667f70388aa9b4820f81b4306140e2001998aa18bab30aa814cc33`
  and `07816814dd9c0e94cfb3b2bfb324425f60b6789b16964780bc1e5f58974d1de3`,
  and raccoon `94721d121b53e2fa3cfb779e6dab1a8a0932cb5fb2827711ca6ed34634db65f6`
  and `9f109d0315d72cf47032c539f023b6f4bfc81010f14a813a31be068223b49e72`.
  There is no companion 768 derivative; the maintained responsive contract is
  1024 plus 512.
- Raccoon correction: the original purpose-built chroma source
  `51c0e243b2d7826e80bb016e111fd18b37dd07aaacea9607e281800917c9bdf8`
  produced a lossy alpha edge and was rejected. A requested alpha correction
  returned baked checkerboard pixels
  (`06d0ccb69dc828075047b8eb1580b883f3997ae3d18b346f6fca453dd6560e6e`)
  and was also rejected. The accepted source
  (`0059348d386d6c79a61d250dedbf69cc488180c213e22dd27744a62ac3bf122e`)
  is an opaque 1254-square warm-paper card, independently exported to 1024 and
  512 WebP. Direct light/dark inspection, sidecar hash/prompt validation, and
  the final reviewer found no magenta, matte, checkerboard, halo, crop, white
  band, text, chart, semantic trend, or private data.
- Board gate: the landing first viewport was proved before later surfaces at
  the board's 1536 by 1024 density and retained on reviewed pilot source
  `b4499f3b953a5745039f1bca67da68e6e135c7c3` as the then-current
  `.impeccable/review/hero-repro.png`. Newest-only retention later removed that
  checkpoint from the current tree. The board approval sidecar is `true`, and
  the board remains an uncropped comparison input rather than a runtime asset.
- Browser matrix: the pilot covers public widths 320, 390, 430, 820, 1280, and
  1440 CSS pixels, actual 200% Chromium page scale, light/dark, forced colors,
  reduced motion, keyboard traversal, accessibility snapshots, pointer
  hit-testing, image failure, and Chromium public-offline replay. Strict
  geometry assertions cover all required semantic regions. The final public
  pilot/offline slice passed 12 cases with 12 intentional project-specific
  skips, and the complete maintained public release matrix passed 56 with 12
  intentional skips.
- Authenticated matrix: synthetic verified, unverified, empty, active-workout,
  image-failure, slow-read, and route-failure states passed. The final maintained
  six-project run finished with 47 passes, three intentional skips, and zero
  failures. The intentional skips are the Chromium-only slow/failure recovery,
  desktop-only 200% runner geometry, and desktop-only incompatible-equipment
  branch. Stale test expectations were narrowed to the new truthful welcome
  heading, exact navigation-cancelled fox requests, intentional-offline
  transport windows, and settled document metadata; cross-engine targeted
  retries passed before the final complete run.
- Infrastructure classification: an initial browser launch attempt failed
  before page execution because the sandbox denied macOS Chromium Mach-port
  registration; the authorized unchanged-source rerun passed. A complete
  public-matrix attempt without the ignored local environment failed only on
  database-backed exercise detail; restarting the identical build with the
  existing ignored `.env.local` produced the final green matrix. Full Vitest
  first reported one loopback `listen EPERM`; the authorized unchanged-source
  retry passed all 839 tests.
- Accessibility and privacy: companion images are empty-alt, `aria-hidden`,
  pointer-inert, outside focus order, hidden without a gap in forced colors,
  static in reduced motion, and failure-collapsible. The landing and Progress
  full/512 assets are public-cache allowlisted; both fox assets, authenticated
  HTML, and private data remain excluded.
- Review protocol: the manual detector ran exactly once. Its five findings are
  pre-existing runner/history side-tab styles outside this diff. The first
  finish review requested only bounded headline, active-phone clearance, and
  raccoon-edge corrections. The follow-up accepted the first two and requested
  the bounded opaque-card or true-alpha asset fix. The fresh final review
  disposition is `ship`, with no material fix or rebuild requested. Product
  Design `design-qa.md` records `Final result: passed.`
- Documentation: the shipped Impeccable documenter ran after the last visual
  correction and produced root `DESIGN.md` plus `.impeccable/design.json`.
  `DESIGN.md`, `design-qa.md`, and all project-owned Markdown remain covered by
  the canonical HTML renderer.
- Complete gates: 123 Vitest files and 839 tests passed; TypeScript and ESLint
  passed; Drizzle metadata plus four files/34 schema tests passed; the exact-two
  seed policy passed; service-worker and documentation parity passed; the
  Next.js 16.3.2 Webpack production build passed; and the 44-entry App Router
  production boundary passed.
- Stop boundary: no merge, deployment, rollout, provider, environment, billing,
  migration, seed, production-data, or sibling-worktree operation was run.
