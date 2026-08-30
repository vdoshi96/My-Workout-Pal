---
name: My Workout Pal
description: A warm field-atlas workout companion for planning, training, and honest progress review.
colors:
  paper: "#f3eee3"
  paper-deep: "#e6e0d5"
  ink: "#0b2f36"
  ink-soft: "#34535a"
  coral: "#b13b27"
  coral-strong: "#9f321f"
  coral-on-ink: "#ff9a82"
  on-coral: "#fffaf0"
  lichen: "#4d603a"
  lichen-light: "#a8b185"
  on-lichen: "#fffaf0"
  stone: "#8d948e"
  rule: "#a8aaa0"
  white: "#fffaf0"
  danger: "#a6352e"
  on-danger: "#fffaf0"
  focus: "#e74f32"
  companion-paper-edge: "#806d4d"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(3.1rem, 13vw, 7.5rem)"
    lineHeight: ".78"
    letterSpacing: "-.04em"
  headline:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.8rem)"
    lineHeight: ".9"
    letterSpacing: "-.035em"
  title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(1.55rem, 4vw, 2.2rem)"
    lineHeight: ".95"
  body:
    fontFamily: "Source Sans 3 Variable, sans-serif"
    fontSize: "1rem"
    lineHeight: "1.5"
  label:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: ".77rem"
    letterSpacing: ".05em"
  action:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 600
    letterSpacing: ".04em"
rounded:
  none: "0"
  circle: "50%"
  media: ".8rem"
spacing:
  xs: ".35rem"
  sm: ".65rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "clamp(2rem, 7vw, 6rem)"
components:
  primary-action:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.on-coral}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    padding: ".8rem 1rem"
    height: "3.6rem"
  navigation:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: ".55rem .5rem"
    height: "3.5rem"
  paper-card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "clamp(1rem, 4vw, 2rem)"
  input-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: ".7rem"
    height: "3.4rem"
  status-stamp:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.coral-strong}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: ".65rem .8rem"
  companion-slot:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "var(--companion-safe-gap) 1rem"
    height: "var(--companion-slot-block-mobile)"
    width: "100%"
---

# Design System: My Workout Pal

## Overview

**Creative North Star: "The Field Notebook Companion"**

My Workout Pal is a warm field-atlas interface: mineral paper, deep blue-green ink, crisp route marks, and coral decisions make planning and logging feel grounded rather than gamified. The visual system keeps the route grammar from `docs/design/DIRECTION.md`—waypoints, ruled sheets, stamped states, and contour surfaces—while keeping the user's task and product truth ahead of decoration.

The selected Corner Companions direction extends that world with one purpose-built, text-free animal vignette in a reserved quiet slot on each pilot surface. The guest landing hedgehog holds a blank notebook, the signed-in home fox prepares beside the personal next action, and the guest Progress raccoon reviews loose paper with three nonsemantic pigment dabs outside the chart and disclosure. The raccoon uses an intentionally opaque warm-paper card as a bounded surface treatment; it is source-faithful, not a transparent crop or a semantic status cue. The composite concept board remains evidence, not a shipping asset.

**Key Characteristics:**

- Warm mineral paper and contour texture with restrained ruled dividers.
- Condensed display type for route labels and humanist sans serif for reading and entry.
- Coral action, lichen compatibility, and deep ink navigation with non-color semantics.
- One calm companion per pilot surface, outside the data and interaction plane.

**The One Companion Rule.** Each pilot surface may use one complete, purpose-built companion vignette as context; the image never carries account, workout, sample-data, progress, or completion meaning.

## Colors

The palette is a field-atlas register: a quiet mineral ground, deep ink for structure, coral for forward action, lichen for compatible or preserved states, and stone rules for supporting information. Dark mode inverts the ground and ink roles while retaining the same semantic accents; forced colors removes decorative companions and relies on the semantic interface.

### Primary

- **Route Coral** (#b13b27): the primary action and active route accent. Use it for the decisive action, selected waypoint, progress bar, and other explicitly active states.
- **Deep Coral** (#9f321f): the stronger action and error-adjacent emphasis used on hover and compact state labels.

### Secondary

- **Lichen Green** (#4d603a): the compatibility, preservation, and confirmed-state accent. It supports a decision; it is not a substitute for its text label.

### Neutral

- **Warm Mineral Paper** (#f3eee3): the default reading ground and public canvas.
- **Deep Paper** (#e6e0d5): the quieter alternate ground for charts, form groups, and tonal separation.
- **Deep Teal Ink** (#0b2f36): navigation, dark information surfaces, core text, and route structure.
- **Soft Teal Ink** (#34535a): secondary copy and supporting facts where the contrast contract allows it.
- **Stone Rule** (#a8aaa0): one-pixel dividers, contours, and inactive structure.
- **Companion Edge Brown** (#806d4d): the restrained edge color around the opaque Progress companion card.
- **Danger Red / Focus Orange** (#a6352e / #e74f32): semantic failure and keyboard-focus colors, always paired with visible text or outline treatment.

**The Semantic Contrast Rule.** Color may reinforce a state, but ownership, verification, sample disclosure, save outcome, and failure must remain legible in words and structure.

## Typography

**Display Font:** Barlow Condensed (with a sans-serif fallback)

**Body Font:** Source Sans 3 Variable (with a sans-serif fallback)

**Character:** The display face is compact, declarative, and route-like; the body face gives instructions, facts, and data a calm reading rhythm. Display labels are uppercase in the built interface, while body copy remains sentence case for comprehension.

### Hierarchy

- **Display** (condensed, `3.1rem–7.5rem`, `.78` line-height): large public and member route statements, sized responsively from the mobile landing scale through the desktop cap.
- **Headline** (condensed, `2rem–3.8rem`, `.9` line-height): section headings such as Progress at a glance and current routine.
- **Title** (condensed, `1.55rem–2.2rem`, `.95` line-height): day names, list titles, and compact records.
- **Body** (regular, `1rem`, `1.5` line-height): explanatory copy, labels with context, forms, and data descriptions; keep long lines near the existing 52–58ch limits.
- **Label** (condensed, `.77rem`, `.05em` tracking): navigation, route numbers, status labels, and short uppercase control text.

**The Label/Reading Split Rule.** Use the condensed face to scan a route or state; use the humanist face to explain what the state means and what the user can do next.

## Layout

The system is mobile-first and never narrower than `320px`. Public and member frames cap at `94rem`; member content uses a `79rem` reading width. On phones, semantic content stacks, the primary action stays above the fixed bottom navigation, and a companion follows the primary copy in its own shallow slot. At desktop widths beginning at `64rem`, public and member headers move navigation into the horizontal header, the landing hero becomes a text-and-art split, and the personal or Progress companion occupies broad side whitespace rather than the data plane.

Spacing follows a compact rhythm built from small control gaps, `1rem` reading intervals, `1.5rem` section gaps, and responsive `clamp()` padding. One-pixel rules and contour surfaces establish alignment without turning the product into a collection of floating cards. A failed or forced-color-hidden companion removes its slot with `display: none` and lets the host grid collapse; it never leaves a blank gap. The same placement component serves landing, member home, and Progress preview.

## Elevation & Depth

The interface is flat by default. Depth comes from the contrast between paper and deep ink, the lighter alternate paper ground, contour imagery, one-pixel rules, and occasional inset selection marks. A restrained ambient shadow is reserved for waypoints and transient notices; the Corner Companions art itself has no drop shadow, glow, or glass treatment. The Progress raccoon card's opaque warm-paper field is a material boundary, not an elevation effect.

**The Tonal Layer Rule.** Prefer paper, deep paper, ink, and rules to extra cards or shadows; add a shadow only when it clarifies a floating or selected interaction.

## Shapes

Most product surfaces use square corners (`0`), thin rules, and clipped contour fields. Circular geometry is reserved for route numerals and the brand mark, where it signals a waypoint or identity anchor. Inputs, public/member sheets, status labels, action bars, and companion slots remain square. The embedded media player is the specialized rounded exception, not a template for general cards. Borders and dashed rules carry structure; rounded containers and decorative frames do not.

## Components

Components are quiet field-sheet primitives: strong semantic labels, crisp edges, and enough padding for touch and keyboard use. The reusable companion slot is decorative and inert, while all product state remains in adjacent semantic markup.

### Buttons

- **Shape:** Square, with the action height and padding from `primary-action`.
- **Primary:** Coral fill, readable on-coral text, condensed uppercase label, and a full-width or fit-content layout according to the host task.
- **Hover / Focus:** Hover deepens the coral; `:focus-visible` uses the high-contrast focus outline with an offset. Reduced motion removes transition timing.
- **Secondary / Ghost / Tertiary:** Secondary links stay quieter and inherit the host field-sheet treatment; they never compete with the primary action.

### Cards / Containers

- **Corner Style:** Square paper sheets and dark ink panels; no generic rounded card grid.
- **Background:** Warm paper for reading, deep paper for secondary chart grounding, white paper for contained sheets, and deep ink for personal or action-priority panels.
- **Shadow Strategy:** Follow the flat-by-default elevation rule; use borders and tonal separation first.
- **Border:** One-pixel stone rules, with dashed rules for empty or provisional structure and a coral/lichen edge only when the state calls for it.
- **Internal Padding:** Responsive `clamp()` padding, usually beginning at `1rem` and expanding toward `2rem` or more on broad surfaces.

### Inputs / Fields

- **Style:** Square fields on paper or white-paper surfaces, one-pixel rule, ink text, and a minimum touch height of roughly `3.2–3.5rem`.
- **Focus:** The shared three-pixel focus outline is visible and offset from the field; do not rely on a color-only border change.
- **Error / Disabled:** Preserve the field and its label, pair danger or disabled styling with explanatory text, and keep retry or recovery controls reachable.

### Navigation

Public navigation exposes Home, Library, Progress, and My workouts; member navigation exposes Home, Library, History, Progress, and Settings. Phone navigation is fixed to the bottom with generous targets and an active coral-on-ink cue. Desktop navigation becomes part of the horizontal header, while the account rail keeps identity, verification, and sign-out visible on member surfaces.

### Corner Companion Slot

The shared placement component gives one complete production asset a bounded, responsive slot. It uses empty alternative text, `aria-hidden`, pointer-inert behavior, and an error path that hides the image and collapses the host grid. The landing and Progress assets are explicitly public-cache safe; both member-fox derivatives remain excluded. The landing hedgehog is eager because it is first-viewport atmosphere; the member fox and Progress raccoon are lazy. The raccoon is intentionally an opaque warm-paper card so its field stays source-faithful in both themes; forced colors hides the entire decorative slot, and reduced motion leaves it static.

## Do's and Don'ts

### Do:

- **Do** keep the field-atlas palette, condensed display silhouette, humanist reading copy, and ruled structure consistent across public and member surfaces.
- **Do** keep adjacent text and controls authoritative: the neutral `Progress` title and `Sample data · not your history` disclosure must remain the truth for the guest preview.
- **Do** use exactly one purpose-built, text-free animal vignette per pilot surface and keep it outside text, fields, charts, disclosures, errors, timers, controls, and navigation.
- **Do** preserve the companion provenance sidecar next to every shipped WebP and keep public companion assets separate from authenticated HTML and data caches.
- **Do** collapse decorative art without a layout gap on image failure or forced colors, and keep it static under reduced motion.
- **Do** treat the selected Corner Companions board as directional evidence only; ship the three dedicated vignettes in `public/illustrations/companions/`.

### Don't:

- **Don't** crop, extract, or reuse a character from the composite gym illustration or the Corner Companions board.
- **Don't** put lettering, numbers, sample values, private data, logos, emoji, CSS art, or handmade SVG art inside a companion image.
- **Don't** make a decorative animal the only signal for account identity, verification, saved activity, progress, completion, or failure.
- **Don't** turn the guest Progress preview into a personal-history claim, or the personal home into a sample-data surface.
- **Don't** let companion art cover account chrome, fixed navigation, controls, charts, disclosure, errors, timers, or the primary action.
- **Don't** introduce generic floating dashboards, gratuitous rounded cards, photorealism, gradients, glass, or mascot-led promotion into this system.
