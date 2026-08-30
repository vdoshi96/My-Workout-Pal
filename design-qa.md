# Wave 3 animal surface-system pilot design QA

## Result

**Final result: passed.**

The bounded Corner Companions pilot is visually ready on the guest landing,
signed-in personal home, and guest Progress preview. The implementation keeps
the board's hierarchy, restrained animal scale, warm mineral paper, deep-teal
ink, coral action, lichen support, ruled structure, and condensed display
silhouette while preserving the released product's truthful states and
interactions.

This result is branch-local. It does not approve a merge, deployment, rollout,
provider change, or production-data operation.

## Reference and build evidence

The sole selected reference is
[`corner-companions-board.png`](.impeccable/mocks/companion-concepts/corner-companions-board.png),
with its recorded prompt and provenance. The board is evidence only and is not
a shipping asset.

The final same-input comparisons pair the full, uncropped board with the latest
production browser capture:

- [Landing desktop, 1536 by 1024 comparison](docs/qa/latest/animal-surface-pilot/landing-board-comparison-1536x1024.png)
- [Landing phone, 390 by 844 comparison](docs/qa/latest/animal-surface-pilot/landing-mobile-board-comparison-390x844.png)
- [Personal home desktop, 1536 by 1024 comparison](docs/qa/latest/animal-surface-pilot/member-board-comparison-1536x1024.png)
- [Personal home phone, 390 by 844 comparison](docs/qa/latest/animal-surface-pilot/member-mobile-board-comparison-390x844.png)
- [Progress desktop, 1536 by 1024 comparison](docs/qa/latest/animal-surface-pilot/progress-board-comparison-1536x1024.png)
- [Progress phone, 390 by 844 comparison](docs/qa/latest/animal-surface-pilot/progress-mobile-board-comparison-390x844.png)

Additional accepted state evidence includes:

- [Progress dark and reduced motion](docs/qa/latest/animal-surface-pilot/progress-preview-1280x1024-dark-reduced.png)
- [Verified personal home](docs/qa/latest/animal-surface-pilot/member-home-ready-chromium-desktop.png)
- [Unverified personal home](docs/qa/latest/animal-surface-pilot/member-home-unverified-webkit-phone.png)
- [Active workout on phone WebKit](docs/qa/latest/animal-surface-pilot/member-home-active-webkit-phone.png)
- [Actual 200% page-scale landing](docs/qa/latest/animal-surface-pilot/landing-1280x1024-page-scale-200.png)

## Surface assessment

| Surface | Fidelity and adaptation | Disposition |
| --- | --- | --- |
| Guest landing | The first viewport preserves the board's two-line `YOUR WORKOUT.` / `YOUR WAY.` grouping, product promise, action priority, open whitespace, and planning hedgehog placement. The full board was compared at its 1536 by 1024 dimensions before later surfaces were built. | Pass |
| Signed-in personal home | The fox occupies reserved content whitespace without entering the account rail, identity, verification notice, routine, equipment, progress, or action regions. Active phone state suppresses the art so Resume remains primary and clears fixed navigation. | Pass |
| Guest Progress preview | The production title remains neutral `Progress`, exactly one sample-data disclosure remains visible, and the raccoon stays outside metrics, history, chart, disclosure, action, and navigation. The intentionally opaque warm-paper card works as a bounded editorial vignette in light and dark themes. | Pass |

The mobile translation preserves content priority rather than shrinking the
desktop composition mechanically. Companion slots move after the semantic lead
content, remain secondary to the primary action, and collapse completely when
hidden.

## Asset quality and provenance

All three shipping vignettes are purpose-built raster assets with text-free
prompts and JSON sidecars under `public/illustrations/companions/`. No character
was cropped from the concept board or composite hero. The board, generated
lettering, personal data, charts, and semantic status cues do not ship in the
art.

The hedgehog and fox use clean transparency. The final raccoon uses an
intentional opaque warm-paper square after a lossy chroma-key candidate and a
baked-checkerboard rerender were rejected. Direct light and dark inspection
shows the complete character with no magenta fringe, gray matte, checkerboard,
halo, crop, or white band. Its 1024 and 512 WebP files match their sidecar
hashes and prompt exactly. A 768 derivative is not part of this scoped
responsive asset contract.

## Responsive and state review

The maintained browser evidence covers 320, 390, 430, 820, 1280, and 1440
CSS-pixel widths, plus the 1536 by 1024 reference density and actual 200%
browser page scale. Chromium covers all six required widths; WebKit covers the
maintained phone widths, with the signed-in fixture exercising the complete
responsive project matrix.

Guest, verified, unverified, empty, active-workout, slow-read, route-failure,
and image-failure states retain their released product truth. No companion
overlaps account chrome, controls, disclosure, metrics, history, charts,
errors, timers, or fixed navigation. Strict bounding-box assertions fail when
required participants are absent rather than silently passing.

## Accessibility, interaction, and resilience

Decorative images have empty alternative text, `aria-hidden="true"`, no focus
target, disabled dragging, and pointer-inert slots. Keyboard traversal,
accessibility snapshots, pointer hit-testing, and automated accessibility checks
confirm that the art cannot become navigation or consume input. Forced-colors
mode removes the entire slot without a layout gap; reduced-motion mode leaves
the static art unchanged.

Image-failure tests remove the complete reserved slot while preserving every
meaningful heading, disclosure, metric, action, and navigation target. Public
landing and Progress assets participate in the explicit offline allowlist;
both fox derivatives and all authenticated HTML/data remain outside the public
cache.

## Review history

1. The initial finish review requested three bounded corrections: remove the
   raccoon's chroma contamination, restore the board-faithful two-line landing
   headline, and keep the active phone resume card above fixed navigation. It
   did not request a rebuild.
2. The headline and active-mobile fixes passed. A CSS blend fallback for the
   contaminated raccoon was rejected because its edge remained visible.
3. A requested true-alpha rerender returned baked checkerboard pixels and was
   rejected as an asset-generation/export failure, not a product failure.
4. The final purpose-built opaque warm-paper card, responsive derivative,
   provenance, and new light/dark captures passed the fresh Impeccable finish
   review with disposition `ship`; no material fix or rebuild remains.

The Impeccable manual detector was run once after visual iteration. Its five
warnings belong to pre-existing runner/history side-tab styles outside this
pilot's diff and do not identify a pilot regression.

## Open risks and boundary

No known material visual defect remains in the bounded pilot. The opaque
raccoon field is an intentional adaptation rather than transparent cutout art;
future asset-system work should preserve this provenance instead of attempting
another lossy color key. Broader animal-surface rollout remains explicitly out
of scope and unapproved.
