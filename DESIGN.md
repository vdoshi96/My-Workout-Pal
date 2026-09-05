---
name: My Workout Pal — Quiet Set
description: A bright illustrated gym with readable cream and forest task surfaces and original cartoon company.
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
  page-heading:
    fontSize: "clamp(2rem, 5vw, 3.8rem)"
    fontWeight: 400
    lineHeight: "1.12"
    letterSpacing: "-.025em"
  section-heading:
    fontSize: "clamp(1.45rem, 3vw, 2.1rem)"
    fontWeight: 400
    lineHeight: "1.12"
    letterSpacing: "-.025em"
  subsection-heading:
    fontSize: "1.35rem"
    lineHeight: "1.12"
    letterSpacing: "-.025em"
  today-heading:
    fontSize: "clamp(2.1rem, 3.7vw, 3.3rem)"
    fontWeight: 400
    lineHeight: "1.12"
  today-heading-phone:
    fontSize: "1.85rem"
  welcome-heading-phone:
    fontSize: "2.75rem"
  routine-heading-phone:
    fontSize: "1.6rem"
  compact-label:
    fontSize: ".75rem"
  supporting-label:
    fontSize: ".8rem"
  field-label:
    fontSize: ".9rem"
  summary-copy:
    fontSize: ".95rem"
  welcome-copy-phone:
    fontSize: "1.05rem"
  welcome-copy:
    fontSize: "1.2rem"
  training-day-choice:
    fontSize: "1.3rem"
  progress-value:
    fontSize: "2.2rem"
    fontWeight: 600
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
  phase: "6px"
  set-tab: "8px"
  field: "10px"
  panel: "12px"
  surface: "14px"
  feature: "16px"
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
  task-surface:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "24px"
  navigation-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.navigation}"
    rounded: "{rounded.field}"
---

# Design system: My Workout Pal

## Overview

**Creative North Star: "Quiet Set"**

My Workout Pal places clear workout actions and readable training numbers in a bright illustrated gym. Cream surfaces, forest ink, sage fields, and optional original cartoon company connect the public welcome to planning, logging, and progress review.

Six original characters use expressive classic 2D theatrical-cartoon drawing, consistent outlines, cel shading, daylight, wood floors, and teal equipment. The user's September 4, 2026 correction names the Looney Tunes / Tom and Jerry tradition as a style reference and rejects naturalistic animals and gloomy environments. The bright illustrated gym and original cast follow that correction; reference characters and branding are not assets.

**Key Characteristics:**

- Cream and forest surfaces with sage separation and visible focus.
- Humanist sans-serif controls and readable, tabular training values.
- Rounded task surfaces with selective soft shadows, ruled lists, and native disclosures.
- Full gym scenes blended into page headings, with smaller compositions on phones.

This record describes the application source in `src/app/quiet-set.css`, its inherited `src/app/globals.css` rules, and the affected components. The final CSS cascade is authoritative when earlier rules remain overridden. Release evidence and its limits belong in `docs/qa/latest/`; this design specification does not assert production verification or user approval.

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

Dark tokens record the values applied through `prefers-color-scheme: dark`; the source keeps the same variable names inside that media query. The welcome artwork uses a theme-specific picture source, while its copy plate deliberately keeps the light cream and forest pairing. Member background environments use an evening source in dark mode; companion scenes reduce brightness and saturation. Settings headings, form labels, preference text, and account sections explicitly inherit the theme ink. The theme follows the system preference.

**The state-in-words rule.** Selection, ownership, pending saves, confirmed saves, and failure remain understandable without color.

## Typography

Source Sans 3 Variable is the loaded body font and the working face for navigation, labels, buttons, instructions, and training values. Controls use sentence case and normal tracking. Training inputs and totals use tabular numerals.

Georgia is the final display choice, with Times New Roman and serif fallbacks. It appears in the welcome, trial completion, routine day headings, and inherited headings. The frontmatter display role records the desktop welcome treatment; phones override its size to `2.75rem`. Other display placements retain their host-specific size and line height. Barlow Condensed remains imported in the layout but is superseded by the display variable override.

Shared public and member headings use balanced wrapping, modest negative tracking, and the page, section, and subsection roles. Today uses its own heading scale and phone override. The runner title uses `training-title`; data entry uses `training-value`, and progress totals use `progress-value`. Supporting labels remain visible. Long explanations use a 65-character measure where the host supports it.

The smaller frontmatter roles record observed labels and supporting copy, rather than an evenly spaced mathematical type scale. Host-specific overrides take precedence. Earlier Today base rules retain a `clamp(1.8rem, 4vw, 2.6rem)` heading and a `1.75rem` phone size in CSS, but the scene heading overrides both. Those dormant values are not recommended tokens. Black stops in an artwork mask control opacity; they are not an additional interface color.

## Layout

Member navigation has four destinations: Today, Routine, Library, and Progress. Below `960px`, it is a fixed four-column bottom bar with safe-area padding. At `960px`, it joins the header as a horizontal row. Member content is capped at `1320px`; desktop padding is `32px`. Tablet padding is `20px 24px 110px`; phones at `700px` and narrower use `8px 16px 100px`.

Page headings combine readable copy with a full illustrated scene. On larger member screens, the heading reserves 42% for art, with the scene occupying 58% and a `280px` minimum height. Phones keep the art: a `220px` heading reserves 38%, and its scene uses 54% width with a `260px` height cap. Off or failed-image states collapse ordinary member heading reservations where the host's selectors apply.

Today has a larger composition. The greeting uses 54% of the desktop width; the Start panel and companion selector use 49%, while Resume uses 52%. Its scene uses 70% width with a `650px` height cap. Phones place a `200px` scene alongside the greeting, followed by full-width Start or Resume and companion choice. The task surface stays above the artwork in the stacking order.

The logger precedes guidance in document order. Below `960px`, the outline follows the logger; broader screens place it beside a main column capped at `720px`. The runner is bounded to `1100px` inside a route container capped at `1200px`. Its header reserves a compact `150px × 95px` scene outside the logger. The disposable trial has a `540px` width cap. Native disclosures keep reference material reachable without displacing active entry.

At `700px` and narrower, the public welcome puts copy before a full-width picture in document flow. Its desktop layout places a cream copy plate over the bright gym. Routine movement titles occupy the full phone content width before their action groups; long names and actions wrap independently.

Spacing uses the repeated control, inset, section, and broad intervals in the frontmatter. Library search and general task surfaces use `24px` padding, with selected phone surfaces reducing to `20px`. The workout entry surface uses `12px` on phones.

**The task-first rule.** Current movement, targets, and entry controls precede reference and decorative content.

## Elevation & Depth

Depth combines illustrated environments, cream-to-sage layering, white-paper task surfaces, and selective soft shadows. Start and Resume use `0 14px 38px #183f3514`; Library search uses `0 10px 32px #183f350a`. The header uses `0 6px 24px #183f3508`, and the phone navigation uses `0 -6px 24px #183f3510`. Actions have no shadow; field boundaries and ruled lists stay explicit.

Member pages with a companion use a plain paper canvas behind the blended scene. Other member pages and the owned workout route retain a faded gym environment that resolves to paper by `720px`. Scene edges fade through intersecting horizontal and vertical alpha masks. The image itself has no portrait border, rounded plate, or shadow. The artwork adds atmosphere without creating an interactive layer.

Color transitions on primary actions and save status use `180ms ease-out` only when reduced motion is not requested. Companion images remain static. Forced colors removes gym and companion imagery and uses semantic system colors for the welcome.

## Shapes

Fields and active navigation use `10px` corners; shared buttons and entry panels use `12px`. Member task surfaces, library lists, and day lists use `14px`. Start and Resume use `16px`, set tabs use `8px`, and the compact workout phase marker uses `6px`. Integrated scene images have square source bounds with masked edges, so they do not use a portrait radius. Circular brand marks and historical map waypoints remain specialized shapes.

## Components

### Buttons

Primary actions use forest fill, cream text, and a semibold sans-serif label. Secondary actions use a rule border. Shared actions, buttons, and selects have at least `48px` height; equipment choices retain an `80px` minimum; disabled buttons use reduced opacity and a noninteractive cursor. Keyboard focus uses a `3px` outline with `4px` offset. No control depends on hover to expose its label.

### Inputs and entry panels

Fields use white paper, an ink label, and a thin rule. The runner groups entry in a rounded fieldset; its numeric fields have at least `56px` height. Trial entry increases that minimum to `64px`. Keep the action and actual save feedback adjacent to the data they affect.

### Set tabs and rest

Set tabs retain numbers and a visible current-state boundary. They scroll horizontally when necessary. On phones, compact tabs omit redundant words while preserving the set number. Rest uses a sage field, a tabular countdown, and labeled controls. Rest artwork never replaces the timer or its state.

### Disclosures and routine controls

Technique, workout outline, equipment, and add-section details use native `details` and `summary` behavior. Optional-cardio absence is neutral supporting text. Routine save status follows the routine title and distinguishes saved, unsaved, saving, and failed states. Removal undo belongs to the unsaved draft; visual reassurance must not imply a published change.

### Navigation

The member active destination uses theme ink as its fill and paper as its text color, plus `aria-current`. Library selects its own nested routes; Routine does not select Library. History and records select Progress. Library stays available before setup, with a labeled dumbbell, bodyweight, and bench scope and a routine setup action. Settings is a contextual utility. Public navigation remains a distinct four-link block for Program, Library, Progress, and My workouts. Do not copy that public example navigation into the member shell.

### Equipment and Settings

Selected equipment uses a complete `2px` lichen outline and `aria-pressed`, with no side stripe or selection shadow. Settings keeps text on the theme ink and contains forms on the shared rounded surface. The browser-local companion preference remains separate from account and training settings.

### Cartoon companions and environments

Seven integrated gym scenes contain six original characters. Today and the landing registry select Pip the stoat or Mica the kingfisher. Library uses an otter studying guidance; Routine uses a beaver planning; Progress and History use a tortoise reviewing; Settings uses a hare preparing equipment. Workout and day surfaces use Pip recovering. These placements are contextual company, not claims about achievements or saved state.

The preference is `pip | mica | off` in browser-local storage under `mwp:companion:v1`. Missing, unsupported, or unreadable values fall back to Pip. Today exposes the compact choice; Settings exposes the full choice. Off hides every companion, including contextual characters; it does not remove the separate gym background or alter workout data. Preference changes update mounted companion components, and storage events synchronize other tabs.

Each scene has a `1200 × 800` WebP and a 600-pixel-wide phone derivative. These are opaque environment illustrations blended with CSS masks, not transparent cutouts or square character portraits. Keep the optimized exports and their prompt/reference provenance together. The earlier public gym environments remain separate assets. Decorative images have empty alternative text, hidden semantics, reserved dimensions, no dragging, and no pointer interaction; image failure hides the slot. Public gym pictures are also decorative. Equipment illustrations are original SVG components for dumbbell, barbell, bench, mat, shoe, towel, timer, and distance marker.

**The optional-company rule.** Cartoon art never communicates technique, saved data, account state, or an outcome; the semantic interface carries those meanings.

## Do's and Don'ts

### Do:

- **Do** keep training actions, numbers, and save feedback ahead of decoration.
- **Do** use the cream, forest, and sage palette with labeled state changes.
- **Do** preserve the contextual cast, Pip/Mica welcome choice, browser-local preference, and global Off.
- **Do** keep the five-day map an optional example rather than a personal-routine constraint.
- **Do** verify the actual host, breakpoint, theme, and critical state before adding art.

### Don't:

- **Don't** reintroduce naturalistic animals or gloomy gym imagery.
- **Don't** restore the retired atlas palette, condensed labels, or uppercase kickers as shared member styling.
- **Don't** label pending work saved or imply automatic load progression.
- **Don't** crop the contextual cast into separate portrait cards or treat opaque scenes as transparent artwork.
- **Don't** infer production readiness, full workflow coverage, or user design approval from this visual specification.
