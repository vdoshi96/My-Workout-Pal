---
name: My Workout Pal — Studio Pals
description: The app lives inside a bright illustrated studio. Warm, playful and light, with a pal who reacts to your workout.
colors:
  canvas: "#fff8ec"
  floor: "#f7e6c4"
  surface: "#ffffff"
  ink: "#1d2b28"
  ink-soft: "#4b5a55"
  brand: "#0f6b66"
  sun: "#ffc93c"
  sun-strong: "#ffb800"
  on-sun: "#1d2b28"
  tangerine: "#ff8b5c"
  on-tangerine: "#1d2b28"
  selected-bg: "#d9f2ee"
  selected-fg: "#1d2b28"
  selected-edge: "#0f6b66"
  hover-bg: "#f2ead9"
  focus: "#c2410c"
  rule: "#8a8f86"
  danger: "#b42318"
  on-danger: "#ffffff"
  dark-canvas: "#191b33"
  dark-floor: "#23264a"
  dark-surface: "#2a2e55"
  dark-ink: "#fbf3e4"
  dark-ink-soft: "#c9c4d8"
  dark-brand: "#7fe0d6"
  dark-selected-bg: "#174a52"
  dark-selected-fg: "#fbf3e4"
  dark-selected-edge: "#7fe0d6"
  dark-hover-bg: "#2a2e55"
  dark-focus: "#ffb27a"
  dark-rule: "#7d82ad"
  dark-danger: "#ff9b8f"
  dark-on-danger: "#191b33"
typography:
  display:
    fontFamily: '"Fredoka Variable", "Source Sans 3 Variable", sans-serif'
    fontWeight: 600
    lineHeight: "1.1"
    letterSpacing: "-.01em"
  body:
    fontFamily: '"Source Sans 3 Variable", system-ui, sans-serif'
    fontSize: "1rem"
    lineHeight: "1.5"
  page-heading:
    fontSize: "clamp(2.2rem, 4.6vw, 3.6rem)"
  hero-heading:
    fontSize: "clamp(2.9rem, 6.2vw, 5.4rem)"
  section-heading:
    fontSize: "clamp(1.5rem, 2.6vw, 2.05rem)"
  action:
    fontFamily: '"Fredoka Variable", sans-serif'
    fontSize: "1.02rem"
    fontWeight: 650
  training-value:
    fontFamily: '"Fredoka Variable", sans-serif'
    fontSize: "1.6rem"
    fontWeight: 600
rounded:
  field: "12px"
  group: "18px–24px"
  tile: "22px"
  pill: "999px"
spacing:
  control: "12px"
  inset: "18px"
  section: "48px"
  broad: "72px"
components:
  primary-action:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.on-sun}"
    border: "2px solid ink (sun in dark mode)"
    shadow: "0 3px 0 ink"
    rounded: "{rounded.pill}"
  secondary-action:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    border: "2px solid ink"
    rounded: "{rounded.pill}"
  selected:
    backgroundColor: "{colors.selected-bg}"
    textColor: "{colors.selected-fg}"
    border: "2px {colors.selected-edge}"
  field:
    backgroundColor: "{colors.surface}"
    border: "2px {colors.rule}"
    rounded: "{rounded.field}"
---

# Design system: My Workout Pal

## Overview

**Creative North Star: "Studio Pals"**

The app lives inside the illustrated studio. A first-time visitor should feel they've walked into a friendly gym with a pal who is glad to see them, not opened a tool they have to learn. Every main screen opens on a full-width scene: the bright studio by day in light mode, the same studio at dusk in dark mode. The pal (Pip the stoat or Mica the kingfisher, chosen in Settings) stands in the room and reacts to the moment.

Content sits on the scene's cream wall, or on the "floor" below it, grouped by whitespace, rounded headings and open rows, not by boxed cards. Boxes stay only where they do a job: form fields, the set you are logging, the rest timer, dialogs and sheets, selected choices and errors.

This file describes `src/app/studio-pals.css` (the design system) and the shared components `SceneStage`, `SceneArt`, `PalSticker`, `DemoSheet` and `BackLink`. Older rules in `globals.css` and `quiet-set.css` read the Quiet Set colour names; those names now resolve to the Studio Pals palette (see Colors). CSS that no markup references is removed with `node scripts/prune-unused-css.mjs`.

## Colors

The palette comes from the art: cream walls, honey wood floors, teal equipment, sunny mats and a coral accent.

- **Canvas, floor, surface.** Warm cream is the page and wall. Honey "floor" tints soft groups. White surface is reserved for fields and sheets.
- **Ink and soft ink.** Deep green-black text and a softer secondary tone.
- **Brand teal.** Links, icons and the edge of anything selected.
- **Sun.** The main action, always with dark text and an ink edge.
- **Tangerine.** Celebrations and records only.
- **Danger.** Errors and destructive actions, always with words.

**The mid-tone rule.** A fill that carries text is either very light (with dark text) or very dark (with light text). White or cream text never sits on a mid-tone, in any state. This rule exists because the September build put cream text on pale sage in dark mode (1.34:1).

**Dark mode is the studio at dusk.** The canvas is the evening sky's own indigo (`#191b33`). Each scene has a dusk version (`*-dusk.webp`, a deterministic recolour of the daytime art; see `docs/design/provenance/quiet-set/`). Instead of a grey overlay, the room shows through a soft lamp-shaped mask that melts into the night canvas, so copy always sits on clean indigo.

**One selected look.** Every selected or current state (navigation, day pills, choice tiles, set tabs, demo tabs, equipment) uses the pale teal fill, dark text and a teal edge, plus a check or words, so meaning never depends on colour alone.

**Verified pairs.** `src/design/contrast-pairs.ts` lists every text, edge and focus pairing by state. `tests/unit/design-token-contrast.test.ts` checks all of them in both themes against WCAG AA (4.5:1 text, 3:1 large text, edges and focus rings) and fails on light text over a mid-tone. The browser state-contrast tests sample the rendered states.

The Quiet Set names map as follows: `--paper` → canvas, `--paper-deep` → floor, `--white` → surface, `--coral` → sun, `--on-coral` → on-sun, `--coral-strong` and `--lichen` → brand, `--lichen-light` → selected fill, `--on-lichen` → canvas. New rules use the Studio Pals names.

## Typography

**Fredoka** (variable, OFL, self-hosted) is the display face: rounded, friendly and readable at a glance. It sets headings, buttons, pills, tab labels and big numbers. **Source Sans 3** stays for body text, labels and long instructions, with tabular numerals for training values. Everything is sentence case. Georgia and Barlow Condensed are retired.

Scale: hero `clamp(2.9rem, 6.2vw, 5.4rem)`, page heading `clamp(2.2rem, 4.6vw, 3.6rem)`, section `clamp(1.5rem, 2.6vw, 2.05rem)`, subsection `1.3rem`. Set-entry values use `1.6rem` Fredoka.

## Layout

- **Scene stage.** `SceneStage` renders a decorative full-bleed scene positioned against the page frame, extending behind the header. Its height is set per page with `--stage-h` (landing about 760px, Today 620px, onboarding and test drive 520–560px; phones 300–400px). Copy starts on the wall at the left on wide screens, and below the pal on phones.
- **Contrast never depends on the picture.** Light mode lays a cream scrim over the wall (opaque behind the copy). Dark mode masks the scene with a radial "lamp" centred on the pal (`--glow-x`, `--glow-y`, `--glow-w`, `--glow-h`) plus a bottom fade.
- **Floor content.** Below the stage, sections are separated by 48–72px, a rounded heading and, where needed, a soft group (a floor tint, 18–24px radius, no border or shadow). Containers never nest.
- **Gutters.** Page content keeps the shared gutter (20px on phones, up to 72px on wide screens). Only the scene is full bleed.
- **Navigation.** Public: brand at left, a floating pill bar on wide screens, and a solid tab bar fixed to the bottom on phones. Members: the same pill bar for Today, Routine, Library and Progress, an account pill (name, Settings, Sign out) on wide screens, and a bottom tab bar on phones.

## Components

- **Actions.** Pill buttons, 52px tall. Primary: sun fill, dark text, ink edge and a 3px ink "ledge" that presses down 2px. Secondary: transparent with an ink edge. Disabled: a dashed rule edge and soft-ink text at full opacity.
- **Fields.** White surface, 2px rule edge, 12px radius. The edge turns teal on focus and red when invalid, with the message next to the field (`aria-invalid` and `aria-describedby`).
- **Choice tiles** (`.pal-choice`). Large radio tiles with a title and a short detail line, and a check that appears when selected.
- **Day pills** (`.pal-day-pill`). Buttons with `aria-pressed`; the chosen day is kept in the address (`/app?day=push`).
- **Movement rows** (`.pal-move`). A numbered circle, the movement name and its target, and a demo trigger. Alternate rows get a soft group tint.
- **Demo sheet** (`DemoSheet`). Native `<dialog>`: a bottom sheet on phones and a centred sheet on wide screens. The YouTube frame mounts only while the sheet is open. Closing (Close, Escape or a tap outside) returns focus to the trigger. Only approved pairs are passed in; otherwise the row says "No demo yet".
- **Back link** (`BackLink`). Labelled with where it goes ("Back to Day 2 · Push") and returns to the exact origin (see `docs/plans/PLAYFUL-COMPANION-OVERHAUL.md`, Navigation contract).
- **Pal sticker** (`PalSticker`). A pose sheet clipped to a cream disc with an ink ring: ready, resting and complete. The sheets are opaque, so they always appear as stickers.
- **Moments.** Set logged: a check pops. Rest: the resting pal and a large timer. Workout complete or record: the complete pal and a one-time confetti burst.

## Motion

Small and earned: the scene rises in (420ms), primary buttons press down (90ms), sheets slide up (200ms), and confetti bursts once (900ms). All motion sits inside `prefers-reduced-motion: no-preference` and is also cancelled by the in-app setting (`data-reduced-motion="true"`). Nothing loops.

## Characters

Six original characters in classic 2D cel style: Pip and Mica (the pal you choose), an otter studying guides (Library), a beaver planning (routines), a tortoise reviewing (Progress and History), and a hare packing a gym bag (Settings). Pip resting on a bench appears on workout screens. The preference `pip | mica | off` lives in browser storage under `mwp:companion:v1`. Off hides every character and keeps the empty studio.

Art is always decorative: empty `alt`, `aria-hidden`, no focus or pointer target, and it never carries technique, saved state or an outcome. Forced-colours mode removes scenes and stickers. If an image fails, the stage collapses to the plain canvas.

## Do's and Don'ts

### Do

- Open primary screens on the studio and let the pal react to the moment.
- Keep the next action, the set you are logging and save feedback ahead of decoration.
- Use the selected tokens for every chosen or current state.
- Check 390px and 1440px in both themes for overlap, clipping and horizontal scroll.

### Don't

- Don't nest cards, or put text in a white plate over the scene.
- Don't put light text on a mid-tone fill.
- Don't add a new colour without adding its pairs to `contrast-pairs.ts`.
- Don't show a demo that isn't an approved pair, or imply automatic load progression.
- Don't reintroduce naturalistic animals, gloomy art, uppercase kickers or the retired atlas look.
