---
name: My Workout Pal — Quiet Set
description: A clear workout companion with cream and forest surfaces and original cartoon company.
colors:
  paper: "#f6f3e9"
  paper-deep: "#e8ecdf"
  ink: "#183f35"
  ink-soft: "#496157"
  coral: "#244f3d"
  coral-strong: "#183f35"
  coral-on-ink: "#e5d9a9"
  on-coral: "#fffdf5"
  lichen: "#3b6146"
  lichen-light: "#c6d7ba"
  on-lichen: "#fffdf5"
  rule: "#a8b6a3"
  white: "#fffdf7"
  focus: "#916314"
  danger: "#a6352e"
  on-danger: "#fffaf0"
  dark-paper: "#142a23"
  dark-paper-deep: "#203c30"
  dark-white: "#1b332a"
  dark-ink: "#f3f0e4"
  dark-ink-soft: "#c3cfc2"
  dark-coral: "#c8ddbc"
  dark-coral-strong: "#dfedce"
  dark-on-coral: "#183f35"
  dark-rule: "#6e8673"
  dark-focus: "#e8c578"
  dark-lichen: "#d2e2bf"
  dark-lichen-light: "#53734f"
  dark-coral-on-ink: "#244f3d"
  dark-danger: "#ff9a91"
  dark-on-danger: "#0b252b"
typography:
  display:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: "clamp(2.9rem, 5vw, 5.2rem)"
    fontWeight: 400
    lineHeight: "1.04"
    letterSpacing: "-.035em"
  body:
    fontFamily: "Source Sans 3 Variable, sans-serif"
    fontSize: "1rem"
    lineHeight: "1.5"
  action:
    fontFamily: "Source Sans 3 Variable, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: "1.3"
    letterSpacing: "0"
  navigation:
    fontFamily: "Source Sans 3 Variable, sans-serif"
    fontSize: ".85rem"
    fontWeight: 600
    letterSpacing: "0"
  training-title:
    fontFamily: "Source Sans 3 Variable, sans-serif"
    fontSize: "clamp(1.45rem, 3.5vw, 2rem)"
    fontWeight: 600
    lineHeight: "1.12"
  training-value:
    fontFamily: "Source Sans 3 Variable, sans-serif"
    fontSize: "1.7rem"
    fontWeight: 600
rounded:
  set-tab: "8px"
  field: "10px"
  panel: "12px"
  feature: "16px"
  companion: "20px"
spacing:
  compact: "8px"
  control: "12px"
  inset: "16px"
  section: "24px"
  broad: "32px"
components:
  primary-action:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.on-coral}"
    typography: "{typography.action}"
    rounded: "{rounded.panel}"
    padding: ".85rem 1.15rem"
  primary-action-hover:
    backgroundColor: "{colors.coral-strong}"
  secondary-action:
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.panel}"
    padding: ".85rem 1.15rem"
  input-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: ".7rem"
  entry-panel:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "16px"
  navigation-active:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.ink}"
    typography: "{typography.navigation}"
    rounded: "{rounded.field}"
---

# Design system: My Workout Pal

## Overview

**Creative North Star: "Quiet Set"**

My Workout Pal gives a workout a clear next action, readable training numbers, and optional original cartoon company. Cream surfaces, forest ink, sage fields, and generous task space connect the public welcome to planning, logging, and progress review.

Pip the stoat and Mica the kingfisher use expressive classic 2D theatrical-cartoon drawing. The user's September 4, 2026 correction names the Looney Tunes / Tom and Jerry tradition as a style reference and rejects naturalistic animals and gloomy environments. The bright illustrated gym and both original characters follow that correction; reference characters and branding are not assets.

**Key Characteristics:**

- Cream and forest surfaces with sage separation and visible focus.
- Humanist sans-serif controls and readable, tabular training values.
- Rounded task panels, flat lists, and native disclosures.
- Decorative cartoon company that yields to the workout.

This record describes the local build from `src/app/quiet-set.css`, its inherited `src/app/globals.css` rules, and the affected components. Production verification remains pending in `docs/qa/latest/QUIET-SET-QA.md`. The finish review cleared four final corrections on captured surfaces only. Missing FORM seed and quality-bar process evidence is not retrospective user approval.

The historical public program map remains an optional five-day example at `/program`. Its waypoint composition does not define the member experience or this visual system. Earlier atlas and Corner Companions briefs remain historical references under `.impeccable/surfaces/`.

## Colors

Forest supplies text and forward actions; warm paper and sage organize content without relying on dark dashboard panels.

### Primary

- **Forest action** uses the existing `coral` variable name. The name is retained for compatibility; its value is green.
- **Forest hover** uses `coral-strong`. **Cream action text** uses `on-coral`.

### Secondary

- **Sage and lichen** support preserved or compatible states and quiet selection fields.
- **Ochre focus** marks keyboard position with an outline, independently of selection.

### Neutral

- **Cream paper** is the page canvas; **deep paper** separates selected and rest regions.
- **White paper** contains editable fields and focused task panels.
- **Forest ink**, **soft ink**, and **sage rules** establish text hierarchy and boundaries.
- **Danger** is reserved for actual errors and destructive context, with a written explanation.

Dark tokens record the values applied through `prefers-color-scheme: dark`; the source keeps the same variable names inside that media query. The welcome artwork uses a theme-specific picture source, while its copy plate deliberately keeps the light cream and forest pairing. This is not evidence of a manually selectable theme.

**The state-in-words rule.** Selection, ownership, pending saves, confirmed saves, and failure remain understandable without color.

## Typography

Source Sans 3 Variable is the loaded body font and the working face for navigation, labels, buttons, instructions, and training values. Controls use sentence case and normal tracking. Training inputs and totals use tabular numerals.

Georgia is the final display choice, with Times New Roman and serif fallbacks. It appears in the welcome, trial completion, routine day headings, and inherited headings. The frontmatter display role records the desktop welcome treatment; phones override its size to `2.75rem`. Other display placements retain their host-specific size and line height. Barlow Condensed remains imported in the layout but is superseded by the display variable override.

Shared public and member headings use balanced wrapping, modest negative tracking, and responsive sizes. The runner title uses the `training-title` role; data entry uses `training-value`. Supporting labels are quieter without replacing visible labels with placeholders. Long explanatory passages use the observed 65-character measure where the host supports it.

## Layout

Member navigation has three destinations: Today, Routine, and Progress. It stays fixed at the phone edge with safe-area padding, then joins the header at `960px`. Member content is bounded to `1240px` at that breakpoint. Phone content uses `20px 16px 100px` padding, leaving room for navigation.

The logger precedes guidance in document order. Below `960px`, the outline follows the logger; broader screens place it beside a main column capped at `720px`. The runner is bounded to `1100px`. The disposable trial has a `540px` width cap. Native disclosures let reference material remain reachable without displacing active entry.

At `700px` and narrower, the welcome puts copy before a full-width, uncropped-flow picture. Its desktop layout places a cream copy plate over the bright gym. Routine movement titles occupy the full phone content width before their action groups. Long names wrap; actions wrap independently.

Spacing uses the frontmatter's repeated control, inset, section, and broad intervals. A Today panel has a `640px` cap. The Today companion appears in its `140px` heading slot from `900px`; other companion hosts retain narrower eligibility rules. Do not infer that every route can display art at that breakpoint.

**The task-first rule.** Current movement, targets, and entry controls precede reference and decorative content.

## Elevation & Depth

The shared task surfaces are flat. One-pixel rules, cream-to-sage layering, and white-paper entry panels provide separation. Actions explicitly have no shadow. Inherited transient PWA notices retain a soft shadow; that exception is not a template for permanent panels. Illustrated environments provide visual depth without adding interactive layers.

Color transitions on primary actions and save status use `180ms ease-out` only when reduced motion is not requested. Companion images remain static. Forced colors removes gym and companion imagery and uses semantic system colors for the welcome.

## Shapes

Rounded controls and contained task panels use the frontmatter's field and panel radii. Featured start and rest surfaces use broader corners; the cream-backed character plates have rounded image corners. Lists and section dividers remain flat and ruled. Circular brand marks and historical map waypoints are specialized shapes, not a requirement for training controls.

## Components

### Buttons

Primary actions use forest fill, cream text, and a semibold sans-serif label. Secondary actions use a rule border. Shared actions, buttons, and selects have at least `48px` height; disabled buttons use reduced opacity and a noninteractive cursor. Keyboard focus uses a `3px` outline with `4px` offset. No control depends on hover to expose its label.

### Inputs and entry panels

Fields use white paper, an ink label, and a thin rule. The runner groups entry in a rounded fieldset; its numeric fields have at least `56px` height. Trial entry increases that minimum to `64px`. Keep the action and actual save feedback adjacent to the data they affect.

### Set tabs and rest

Set tabs retain numbers and a visible current-state boundary. They scroll horizontally when necessary. On phones, compact tabs omit redundant words while preserving the set number. Rest uses a sage field, a tabular countdown, and labeled controls. Rest artwork never replaces the timer or its state.

### Disclosures and routine controls

Technique, workout outline, equipment, and add-section details use native `details` and `summary` behavior. Optional-cardio absence is neutral supporting text. Routine save status follows the routine title and distinguishes saved, unsaved, saving, and failed states. Removal undo belongs to the unsaved draft; visual reassurance must not imply a published change.

### Navigation

The member active destination uses a sage background with `aria-current`. Settings is a contextual utility. Public navigation remains a distinct four-link block for Program, Library, Progress, and My workouts. Do not copy that public example navigation into the member shell.

### Cartoon companions and environments

The shared decorative registry retains surface keys but selects Pip or Mica from browser-local preference `mwp:companion:v1`; missing or unsupported values fall back to Pip. Off removes the illustration. The preference is not an account setting and does not change workout data.

Ready also serves neutral placements; history and public progress use the complete pose, and the workout registry maps to resting. CSS hides the runner, routine-editor, and Settings header art in the redesigned surfaces. Host eligibility remains authoritative; a registry entry does not prove visible runtime placement.

Each character export is a cream-backed `320 × 320` WebP, not a transparent cutout. The family contains eight prompt-bearing source images and 10 optimized public exports: six character poses and two gym environments at two widths each. Preserve asset provenance when replacing them. Decorative images have empty alternative text, hidden semantics, reserved dimensions, no dragging, and no pointer interaction; image failure hides the slot. The public gym picture is also decorative. Equipment illustrations are original SVG components for dumbbell, barbell, bench, mat, shoe, towel, timer, and distance marker.

**The optional-company rule.** Cartoon art never communicates technique, saved data, account state, or an outcome; the semantic interface carries those meanings.

## Do's and Don'ts

### Do:

- **Do** keep training actions, numbers, and save feedback ahead of decoration.
- **Do** use the cream, forest, and sage palette with labeled state changes.
- **Do** preserve original cartoon Pip/Mica artwork, browser-local choice, and Off.
- **Do** keep the five-day map an optional example rather than a personal-routine constraint.
- **Do** verify the actual host, breakpoint, theme, and critical state before adding art.

### Don't:

- **Don't** reintroduce naturalistic animals or gloomy gym imagery.
- **Don't** restore the retired atlas palette, condensed labels, or uppercase kickers as shared member styling.
- **Don't** label pending work saved or imply automatic load progression.
- **Don't** treat cream-backed character plates as transparent artwork.
- **Don't** infer production readiness, full workflow coverage, or user design approval from the captured finish fixes.
