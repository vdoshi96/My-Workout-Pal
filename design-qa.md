# Wave 3 animal surface-system design QA

## Result

**Final result: passed. Fresh Impeccable disposition: `ship`.**

The approved Corner Companions pilot remains intact on the guest landing,
signed-in personal home, and guest Progress preview. The Wave 3 rollout extends
the same reusable, comp-first system to public/member Library, the owned routine
editor, History list/detail, Settings, and the workout runner without turning an
animal into navigation, coaching, status, validation, or data.

This result is branch-local. It does not approve a merge, deployment, Wave 4,
provider or alias change, environment or billing change, migration, seed, or
production-data operation.

## Reference and build evidence

The sole selected visual reference is the complete, uncropped
[`corner-companions-board.png`](.impeccable/mocks/companion-concepts/corner-companions-board.png).
It remains evidence only and is not a runtime asset. The rollout comparison
images place that full board beside the final production-browser surface:

- [Public Library desktop](docs/qa/latest/animal-surface-rollout/comparisons/public-library-1440x1000-light-reference-comparison.png)
- [Member Library desktop](docs/qa/latest/animal-surface-rollout/comparisons/member-library-chromium-desktop-reference-comparison.png)
- [Routine editor desktop](docs/qa/latest/animal-surface-rollout/comparisons/routine-editor-chromium-desktop-reference-comparison.png)
- [History list desktop](docs/qa/latest/animal-surface-rollout/comparisons/history-list-chromium-desktop-reference-comparison.png)
- [Settings desktop](docs/qa/latest/animal-surface-rollout/comparisons/settings-chromium-desktop-reference-comparison.png)
- [Neutral runner desktop](docs/qa/latest/animal-surface-rollout/comparisons/runner-neutral-chromium-desktop-reference-comparison.png)

The implementation preserves the board's restrained animal scale, warm mineral
paper, deep-teal ink, coral action, lichen support, ruled structure, contour
surfaces, and condensed display silhouette. Every new asset is complete and
purpose-built; neither the board nor the composite landing hero was cropped.

## Surface assessment

| Surface | Adaptation and product-priority boundary | Disposition |
| --- | --- | --- |
| Public/member Library | The otter occupies reserved heading whitespace and remains separate from equipment, search, filters, create actions, results, and private member data. | Pass |
| Owned routine editor | The beaver appears only in a clean neutral desktop heading slot, outside equipment review, topology controls, fields, validation, status, chooser, and removal review. Dirty or critical states remove it. | Pass |
| History list/detail | The tortoise remains outside filters, pagination, session facts, sets, cardio, notes, and immutable history data. Phone layouts collapse the art. | Pass |
| Settings | The hare uses a stable heading-side slot only when the member is verified, browser identity is ready, preferences are clean, and no save/error/deletion state is active. Any unsaved units, timezone, or reduced-motion change removes it before save. | Pass |
| Workout runner | The bear appears only in a recovered, online, neutral overview at broad widths. Phone, active logging, timer, guidance, pending, offline, recovery, blocking/error, and terminal states all remove it. | Pass |
| Pilot surfaces | Landing hedgehog, personal-home fox, and guest-Progress raccoon retain their approved placements, state truth, responsive behavior, and cache boundaries. | Pass |

The phone translation gives all space to semantic content and fixed navigation.
At 820 pixels, only a measured safe slot may remain; Library, editor, History,
and runner stay collapsed while Settings may render only under its complete
neutral-state predicate. At desktop widths, art occupies whitespace rather than
the task or data plane.

## Asset quality and provenance

The rollout ships five new original concepts and their 512-pixel derivatives:
cataloging otter, routine-drafting beaver, history-archive tortoise,
settings-packing hare, and workout-corner bear. Final alpha, edges, transparent
margins, light/dark composites, dimensions, exact prompts, and SHA-256 hashes
passed asset QA. Rejected candidates—checkerboard exports, an obscured-foot
hare, and a wrong-subject beaver—do not ship.

Fetchable public directories contain WebPs only. Private-safe same-basename
records under `docs/design/provenance/companions/` and
`docs/design/provenance/illustrations/` retain exact prompts, dimensions,
transformations, and verified output hashes without absolute local paths or
generation identifiers.

## Responsive, zoom, and state review

Maintained browser coverage exercises 320, 390, 430, 820, 1280, and 1440 CSS
pixels in Chromium and WebKit phone, tablet, and desktop projects. Light, dark,
reduced-motion, forced-color, image-failure, slow/failure/retry, offline, active,
recovery, and terminal conditions preserve product truth and collapse art when
space or state becomes critical.

CDP page-scale simulation is recorded separately from true native 200% browser
zoom. Headed native proof covers public Library, member Library, and History:

- [Public Library native 200%](docs/qa/latest/animal-surface-rollout/public-library-native-200-chromium.png)
- [Member Library native 200%](docs/qa/latest/animal-surface-rollout/member-library-native-200-chromium.png)
- [History native 200%](docs/qa/latest/animal-surface-rollout/history-list-native-200-chromium.png)

Each native record proves a two-to-one device-pixel ratio, a halved inner width,
`visualViewport.scale === 1`, no horizontal overflow, and collapsed art. This is
real reflow evidence rather than a CDP screenshot-scale approximation.

## Accessibility, interaction, and resilience

All companion images use empty alternative text, `aria-hidden="true"`, no
accessible name, no focus target, disabled dragging, and pointer-inert slots.
Strict protected-selector geometry checks fail if either participant is missing
and prove non-overlap with fields, filters, reviews, data, guidance, timers,
logging controls, notices, and navigation. Keyboard traversal, accessibility
snapshots, pointer hit-testing, and automated accessibility checks confirm that
art cannot consume or label an interaction.

Image failure and forced colors remove the complete slot without a residual gap.
Reduced motion leaves the static art unchanged. The authenticated harness copies
only exact required assets under a SHA-keyed, lock-protected staging boundary
with partial-failure cleanup and preservation of pre-existing destinations.
WebKit cancellation allowances require an allowlisted same-origin GET image,
the exact cancellation failure class, and demonstrable superseding navigation.

## Cache and privacy assessment

For Wave 3, only `cataloging-otter.webp` and
`cataloging-otter-512.webp` enter the public cache because public `/library`
uses them. Runtime offline evidence opens `/library`, verifies both otter
variants and the route in cache, then reloads the page offline. The fox, beaver,
tortoise, hare, bear, owned routes, authenticated HTML, and private data are
explicitly absent. Pilot public-cache eligibility remains unchanged.

## Review history

1. The implementation extended the pilot semantic tests, added state predicates
   and exact protected-selector assertions, and generated only purpose-built
   assets where reuse was not contextually faithful.
2. The Impeccable manual detector ran exactly once after implementation. Its
   broad warnings described pre-existing monolithic CSS and design-scale
   advisories; it found no new mechanical rollout defect.
3. The fresh finish reviewer found one bounded Settings issue: art remained
   eligible after an unsaved preference edit. The rollout added a clean/dirty
   predicate, a unit assertion, and a pre-save browser assertion, then refreshed
   desktop/phone evidence and the full-board comparison.
4. The bounded re-review closed that finding, confirmed every integration-audit
   item, and issued final disposition `ship`. The detector was not rerun.
5. The Impeccable documenter then refreshed `DESIGN.md` and
   `.impeccable/design.json` from the final corrected implementation.
6. Closeout hardening added failure/concurrency-safe fixture staging, private-safe
   provenance placement, runtime offline `/library` proof, and narrow WebKit
   cancellation evidence. The time-boxed final authenticated matrix had one
   engine-only canceled `contours.svg` request during teardown and no failed
   product assertion; the immediately preceding complete WebKit phone project
   passed 22/4, including the same routine and all rollout/resilience journeys.
7. A fresh independent closeout review then validated every retained capture,
   all eight integration-audit verdicts, and the isolated WebKit teardown note.
   It found no product, visual, accessibility, cache, privacy, or ownership
   defect and retained final disposition `ship`.

## Open risks and boundary

No known material visual defect remains. The public service worker continues to
make public artwork fetchable offline by design; provenance records therefore
stay outside public directories. Settings and runner art intentionally has a
narrow eligibility window, and content wins whenever future state or layout
changes make the reserved slot unsafe.

The branch is ready to push for review only. Merge, deployment, production
mutation, sibling-worktree cleanup, and Wave 4 integration remain out of scope.
