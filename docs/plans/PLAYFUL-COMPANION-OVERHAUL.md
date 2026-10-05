# Playful companion overhaul

## Outcome

The owner wants a first-time visitor to think: *"Oh wow, this is a great companion for my workouts. I can set my routine, track my workouts at the gym, watch videos if I need to, and see my progress and gains."* The app should feel fun, playful and light, never like a tool you have to learn first.

The September production-grade audit (PR #8, main `4db767f`) made the app correct. The owner then used it and named five failures:

1. It feels like a corporate presentation: too many boxed cards on a flat green-and-cream page.
2. The art is an afterthought: a scene dropped into a corner instead of the place the app lives in.
3. White text on highlighted or selected options is hard to read.
4. Onboarding is pointless: one push-up set, no demo video, no question about goals, no picture of how the app is used.
5. Back navigation is missing: a demo opened from the plan has no way back to the same spot.

This plan records the Phase 0 audit and the Phase 1 direction. Phase 1 ends with a prototype of the landing page and member Today, and then **stops for owner approval**. Phase 2 (rollout) does not begin until the owner approves the direction or sends changes.

Every `AGENTS.md` rule still applies. This plan overrides only what the owner's October 4 brief overrides: the visual system can change from Quiet Set, onboarding can ask new questions and persist new answers, and browser tests that check a deliberately retired layout can be updated under the ledger rules in [Phase 2](#phase-2-rollout-after-approval).

## Contents

- [Phase 0: audit of the current state](#phase-0-audit-of-the-current-state)
  - [Capture method](#capture-method)
  - [Box inventory](#box-inventory)
  - [Contrast audit](#contrast-audit)
  - [Navigation map](#navigation-map)
  - [Onboarding walkthrough](#onboarding-walkthrough)
  - [Art inventory](#art-inventory)
- [Phase 1: the new direction](#phase-1-the-new-direction)
- [Phase 2: rollout (after approval)](#phase-2-rollout-after-approval)
- [Acceptance criteria](#acceptance-criteria)
- [Tests and evidence](#tests-and-evidence)
- [Open questions for the owner](#open-questions-for-the-owner)

---

## Phase 0: audit of the current state

No application code changed during Phase 0.

### Capture method

- **Public screens:** `next dev --webpack` on `127.0.0.1:3118` with the read-only local environment, warmed with the route loop from `PRODUCTION-GRADE-IMPLEMENTATION.md` § Commands. Run with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3118 pnpm exec playwright test --config playwright.capture.config.ts`.
- **Member screens:** the synthetic authenticated fixture (in-memory PGlite, Alice QA), through `node scripts/test-e2e-authenticated.mjs --capture`. The capture walks onboarding with the example routine, opens every member page, starts a workout, logs a set, pauses rest and opens the end dialog. A second scope finishes a one-movement workout so Progress, History and Records have content.
- **Viewports and themes:** four Chromium projects: 390 × 844 phone and 1440 × 1000 desktop, each in light and dark (`colorScheme`). Reduced motion is on, so captures are stable.
- **Output:** full-page PNGs plus a `*.contrast.json` sample file per screen in `docs/qa/runs/capture/<project>/` (ignored by Git, because these are scratch captures). Reviewed images are downscaled to CSS pixels and copied into [`docs/design/playful-overhaul/`](../design/playful-overhaul/). They are design-review material, so `docs/qa/latest/` keeps only the newest completed QA run until Phase 2 replaces it.
- **Contrast sampling:** `tests/capture/capture-kit.ts` measures every visible interactive element in the page, groups identical elements by tag, classes and state, and composites translucent backgrounds down to an opaque colour. On desktop it also hovers one element per group, then walks the page with the Tab key so `:focus-visible` styles apply exactly as a keyboard user sees them. `tests/capture/summarize-contrast.mjs` turns the samples into the tables below.
- **Limits:** YouTube frames are replaced by an inert local page, so the images say nothing about playback. Full-page phone captures repeat the fixed bottom navigation partway down the page; that is a screenshot artefact, not a layout bug. The dev server shows its small Next.js indicator in the bottom-left corner of public captures.

The baseline images are in [`docs/design/playful-overhaul/before/`](../design/playful-overhaul/before/). The baseline was captured from an untouched checkout of `main` at `4db767f`.

### Box inventory

Read from source and checked against the captures. **G** is `src/app/globals.css`; **Q** is `src/app/quiet-set.css`, which loads after G and wins ties. **K** keep, **M** merge, **R** remove. A box is any filled, bordered or shadowed container that renders today. Plain rules between list rows don't count.

The rule used for each call: keep a box only where it carries real function (a form field, the active set entry, a dialog, the rest timer, a selected state, an error). Everything else moves onto the scene with whitespace, type and soft grouping.

#### Totals per screen

| Screen | Box kinds | K | M | R | Art on screen today |
|---|---|---|---|---|---|
| Shared public chrome and PWA toasts | 4 | 4 | 0 | 0 | none |
| Shared member chrome | 5 | 4 | 1 | 0 | faded page backdrop |
| `/` | 2 | 0 | 1 | 1 | dawn/evening studio beside a cream copy plate |
| `/try` | 2 | 2 | 0 | 0 | **none** |
| `/program` | 2 | 1 | 1 | 0 | **none** |
| `/program/[day]` | 2 | 0 | 0 | 2 | **none** |
| `/library` | 4 | 2 | 1 | 1 | otter-study |
| `/library/[slug]` | 2 | 2 | 0 | 0 | **none** |
| `/progress` | 4 | 0 | 2 | 2 | tortoise-review |
| `/sample-workout` | 5 | 0 | 3 | 2 | **none** |
| `/sign-in` | 4 | 3 | 1 | 0 | **none** |
| `/offline`, not-found, error pages | 0 | 0 | 0 | 0 | **none** |
| `/app` Today (with a routine) | 6 | 1 | 1 | 4 | pip-studio or mica-studio |
| `/app` Today (onboarding) | 4 | 2 | 1 | 1 | pip-studio or mica-studio |
| `/app/program/[day]` | 1 | 0 | 0 | 1 | pip-recover |
| `/app/program/edit` (plus movement chooser) | 18 (+9) | 9 | 5 | 4 | beaver-plan, only in calm states |
| `/app/programs` | 7 | 4 | 2 | 1 | beaver-plan |
| `/app/library` | 4 | 1 | 1 | 2 | otter-study |
| `/app/library/[slug]` | 2 | 2 | 0 | 0 | backdrop only |
| `/app/library/custom` | 1 | 0 | 0 | 1 | backdrop only |
| `/app/library/custom/new` and `[id]` | 4 | 1 | 2 | 1 | otter-study |
| `/app/progress` | 5 | 1 | 1 | 3 | tortoise-review |
| `/app/history` | 4 | 1 | 2 | 1 | tortoise-review, only with sessions |
| `/app/history/[sessionId]` | 4 | 0 | 2 | 2 | tortoise-review |
| `/app/prs` | 2 | 0 | 1 | 1 | tortoise-review |
| `/app/settings` | 11 | 4 | 3 | 4 | hare-prepare, only in calm states |
| `/workout/[sessionId]` (incl. rest) | 18 | 10 | 5 | 3 | backdrop, plus a 150 × 95 pip-recover slot that is hidden almost always |

**Deepest nesting:** Settings equipment (white plate → bordered white review panel → notice); onboarding (white form plate → white choice plate → bordered white tile, three whites deep); program editor (day panel → white section → tinted cardio card → fields); workout (white `.runner-main` → white `.runner-editor`, with the rest timer inside the same plate).

#### Shared chrome

| # | Element | Source | CSS | Holds | Rec | Reason |
|---|---|---|---|---|---|---|
| C1 | Public nav current item | `public-shell.tsx:32` | Q42 ink fill | Nav label | K | Selected state |
| C2 | Member header | `authenticated-shell.tsx:49` | Q350 white fill + shadow | Brand, identity, settings, sign-out, nav | M | Transparent over the scene; keep only the nav pill |
| C3 | Member phone tab bar | `authenticated-nav.tsx:26` | Q49 white + top rule, Q427 shadow | 4 destinations | K | A fixed bar has to stay readable |
| C4 | Member nav current item | `authenticated-nav.tsx:29` | Q352 ink fill | Label | K | Selected state |
| C5 | Verification banner | `authenticated-shell.tsx:73` | G211 forest fill | Message + resend | K | Blocking account status |
| C6–C8 | PWA toast, offline indicator, install error | `pwa-registration.tsx:171–195` | G98–G107 | Transient status | K | Toasts and errors |

#### Public screens

| # | Screen | Element | Source | CSS | Rec | Reason |
|---|---|---|---|---|---|---|
| L1 | `/` | Account-deleted notice | `page.tsx:14` | G222 forest fill | M | One shared soft status strip |
| L2 | `/` | Welcome copy plate | `page.tsx:16` | Q213 cream fill, 16px radius | R | The art has a cream wall; a soft scrim replaces the plate |
| T1 | `/try` | Reps input | `try-one-set.tsx:41` | Q34 white field | K | Field |
| T2 | `/try` | Practice rest timer | `try-one-set.tsx:32` | Q234 paper-deep fill | K | Timer |
| P1 | `/program` | Equipment toggle | `program-explorer.tsx:18` | G588–G591 | K | Segmented selected state |
| P2 | `/program` | Day cards × 5 | `program-explorer.tsx:23` | Q186 border, white fill | M | Open illustrated day rows, still fully clickable |
| D1 | `/program/[day]` | Cardio sheet | `program/[day]/page.tsx:55` | G130 ink slab | R | Dark slab; a heading is enough |
| D2 | `/program/[day]` | Cardio option tiles | same | G133 border, inside D1 | R | Information only |
| LB1 | `/library` | Equipment toggle | `library/page.tsx:48` | G588/G591 | K | Selected state |
| LB2 | `/library` | Search input and button | `library/page.tsx:66,73` | G594/Q34 | K | Field |
| LB3 | `/library` | Empty state | `library/page.tsx:87` | G600 dashed rule | R | Text plus art |
| LB4 | `/library` | Movement cards | `library/page.tsx:94` | Q186 border, white fill | M | Open rows with a demo affordance |
| EG1 | Guides | Video tabs | `curated-video-player.tsx:52` | G608, Q169; selected uses undefined `--route` | K | Selected tab; fix the missing token |
| EG2 | Guides | Video frame | `curated-video-player.tsx:77` | G613, Q172 | K | Media frame |
| PR1 | `/progress` | "Example data" badge | `progress/page.tsx:27` | G624 2px border | M | Soft pill |
| PR2 | `/progress` | Metric cells | `progress/page.tsx:33–35` | G626/G720 rules | M | Open stat row |
| PR3 | `/progress` | Chart panel | `progress/page.tsx:54` | G637 fill | R | Fill isn't needed |
| PR4 | `/progress` | Closing CTA band | `progress/page.tsx:66` | G645 ink slab; the forest button is nearly invisible on it | R | Dark slab |
| SW1–SW3 | `/sample-workout` | Badge, stamp, set chips | `sample-workout/page.tsx:46–79` | G624, G120, G662 | M | Pills and inline set text |
| SW4–SW5 | `/sample-workout` | Dark side panel with nested cardio frame | `sample-workout/page.tsx:89,97` | G665, G672 | R | Dark slab with a nested frame |
| SI1 | `/sign-in` | Auth sheet | `sign-in/page.tsx:40` | G683 white + border | M | At most one soft plate |
| SI2–SI4 | `/sign-in` | Mode tabs, provider button, fields | `auth-panel.tsx:105–121` | G685–G693 | K | Selected state, button, fields |

#### Member screens

| # | Screen | Element | Source | CSS | Rec | Reason |
|---|---|---|---|---|---|---|
| TD1 | Today | Verification notice | `member-program-home.tsx:71` | G222 | M | Shared status strip |
| TD2 | Today | Resume card | `member-program-home.tsx:78` | Q388 white + shadow | R | Heading and action sit on the scene |
| TD3 | Today | Start panel | `member-program-home.tsx:106` | Q387 white + shadow | R | Same |
| TD4 | Today | Day select | `member-program-home.tsx:109` | Q34 | K→M | Becomes a row of day pills (selected state) |
| TD5 | Today | All-days list | `member-program-home.tsx:126` | Q397 white plate | R | Day pills and open rows |
| TD6 | Today | Progress at a glance | `member-program-home.tsx:139` | Q411 white plate | R | Open stat row |
| OB1 | Onboarding | Wizard plate | `onboarding-form.tsx:106` | Q400–403 white | R | Fields carry their own edges |
| OB2 | Onboarding | Choice tiles | `onboarding-form.tsx:111,129` | Q98 white label + G322 bordered span | M | One choice tile with a selected outline |
| OB3–OB4 | Onboarding | Selects, search | `onboarding-form.tsx:120–137` | Q34 | K | Fields |
| DY1 | Day | Cardio and start card | `app/program/[day]/page.tsx:64` | G351 white + border | R | Side column on the scene |
| RE1–RE18 | Routine editor | Notices, equipment panel and review, outline rail, day editor, section fieldsets, cardio cards, footer, five dialogs | `program-editor.tsx`, `equipment-profile-control.tsx` | G450–G528, Q81–Q85, Q313–Q321 | 9 K / 5 M / 4 R | Keep fields, menus, errors and dialogs. Remove the day plate, the invisible white-on-white section plate and the nested cardio cards. Merge the outline rail, equipment review and footer into open, sticky or inline forms |
| MC1–MC9 | Movement chooser dialog | Dialog, header band, search, filter chips, results, guidance status, fieldsets, inline create, phone bar | `movement-chooser.tsx:456–706` | G726–G756, Q208 | 6 K / 2 M / 1 R | Keep the dialog and its selection states; lighten the ink header band |
| PC1–PC7 | Routines | Notice, routine cards, dark create panel, choice tiles, fields, error, duplicate dialog | `program-collection.tsx:328–624` | G275–G311 | 4 K / 2 M / 1 R | Remove the dark create slab (open it in a sheet); open rows with only the active highlight |
| ML1–ML4 | Member Library | Search plate, input, empty state, result lists | `app/library/page.tsx:64–114` | Q400–405 | 1 K / 1 M / 2 R | The input is the box; open ruled lists |
| CL1, CE1–CE4 | Custom movements | Empty state, notice, fields, fieldsets, danger zone | `custom-exercise-editor.tsx:188–288` | G223, G429–G441 | 1 K / 3 M / 2 R | Legends as subheadings; danger heading instead of a frame |
| PG1–PG5 | Progress | Totals plate, empty state, timeline plate, meter, source links | `progress-insights-view.tsx:33–111` | Q411, Q400–403, G1041–G1050 | 1 K / 1 M / 3 R | Open stat row and open timeline |
| HI1–HI4 | History | Filter, empty state, session rows, state badge | `history/page.tsx:85–107` | G976–G989 | 1 K / 2 M / 1 R | Open rows, soft pill |
| HD1–HD4 | History detail | Badge, exercise cards, dark cardio panel, nested stat tiles | `training-history-detail.tsx:98–227` | G989–G1017 | 2 M / 2 R | Sections split by whitespace |
| PRS1–PRS2 | Records | Empty state, record cards | `personal-records-view.tsx:36–67` | G1022, Q400–403 | 1 M / 1 R | Trophy rows with a celebration accent |
| ST1–ST11 | Settings | Notice, three white plates (preferences, characters, account), equipment plate and nested review, blockers, delete preview, delete dialog | `settings-form.tsx:342–473` | Q497–Q498, G384–G414 | 4 K / 3 M / 4 R | Headings and whitespace; the dialog does the confirming |
| WR1–WR18 | Runner | Route bar, opaque runner column, status pills, banners, outline, main plate, phase chip, set tabs, **active set entry**, fields, **rest timer**, empty notes, guidance items, cardio tiles, target, footer, dialogs, recovery state | `workout-runner.tsx:1331–2152`, `owned-workout-runner.tsx`, `workout/[sessionId]/page.tsx` | G811–G924, Q113–Q162, Q413–Q417 | 10 K / 5 M / 3 R | The set entry and the rest timer are the two boxes this screen needs. Remove the opaque column that hides the scene and the white main plate around the set entry |

#### Cascade problems found during the inventory

1. **The member page background flips while you work.** `.member-frame:has(.decorative-companion)` (Q467) swaps the scene backdrop for plain paper whenever a companion is mounted. The editor and Settings mount the companion only in calm states, so the background jumps as soon as there are unsaved edits.
2. **Undefined colour tokens:** `--route`, `--route-dark` (G609, G618) and `--mint` (G1004). The selected video tab loses its ring and the history plan-detail border never draws.
3. **One danger-bordered dialog style is reused for everything** (G406): discard changes, skip exercise, end workout, and account deletion all look like deletion.
4. **Dead CSS:** retired heading boxes (G227, G360, G380, G451, G965), runner frames (G854, G870, G885), companion hide rules (G1069–G1135), the never-rendered `.companion-switcher` (Q391–395, Q446–448, Q490) and the cancelled `contours.svg` surface.
5. **Dark landing on phones keeps a cream copy plate** at the top while the rest of the page is dark (Q261), so the hero looks pasted in.

### Contrast audit

Measured in the browser on all 39 captured screens: 2,552 samples across default, hover, keyboard focus, selected/current and disabled states, in both themes. Hover and focus were sampled at 1440px (phones have no hover). Thresholds are WCAG AA: 4.5:1 for text, 3:1 for large text, and 3:1 for focus rings and the edges that identify a control.

#### Text below AA

| Theme | State | Element | Text | Text colour | Background | Ratio | Needs | Screens |
|---|---|---|---|---|---|---:|---:|---|
| dark | selected, hover | Equipment toggle (`.profile-links a[aria-current]`, G591) | Dumbbells | `#fffdf5` | `#d2e2bf` | **1.34** | 4.5 | `/program`, `/library` |
| dark | selected, hover, focus | Sign-in mode tab (`.auth-tabs button[aria-pressed]`, G690) | Sign in | `#fffdf5` | `#d2e2bf` | **1.34** | 4.5 | `/sign-in` |

Both are the owner's complaint exactly: white text on a highlighted option. The cause is one token. In dark mode `--lichen` becomes a pale green (`#d2e2bf`), but `--on-lichen` stays cream (`#fffdf5`) because the dark theme never redefines it. The same pair passes in light mode (6.91:1), which is why the light-mode audit in September didn't catch it.

#### Focus rings and control edges below 3:1

| Theme | State | Element | Edge | Against | Ratio | Screens | Note |
|---|---|---|---|---|---:|---|---|
| light | focus | Primary action on a dark slab | `#916314` | `#183f35` | **2.22** | `/progress`, `/sample-workout`, Routines | The ochre ring disappears on the forest CTA band, side panel and create panel |
| dark | focus | Primary and secondary actions on the cream copy plate | `#e8c578` | `#f6f3e9` | **1.49** | `/` | The dark-theme ring is pale gold, but the landing plate stays cream |
| dark | focus | Primary action on cream fills | `#e8c578` | `#f3f0e4` | **1.45** | `/progress`, `/sample-workout`, Routines | Same cause |
| both | focus | YouTube frame | none | `#000000` | **0** | Guides | The iframe has no visible focus ring |
| light | selected | Checkbox row edge (`.onboarding-check`, `.settings-check`) | `#a8b6a3` | `#fffdf7` | **2.09** | Onboarding step 2, Settings | The native checkbox still shows the state; the row edge is too faint to read as a control |

#### Passing states worth recording

| State | Light | Dark |
|---|---:|---:|
| Member nav current item (ink fill) | 10.5 | 13.3 |
| Runner current set tab | 9.7 | 10.5 |
| Selected demo tab | 10.4 | 13.3 |
| Selected equipment option (Settings, editor) | 11.5 (edge 6.9) | 11.8 (edge 9.9) |
| Selected onboarding choice (edge on the inner tile) | edge 6.9 | edge 9.9 |
| Primary action text (cream on forest / forest on sage) | 9.1 | 8.1 |
| Disabled primary action | 9.1 | 8.1 |
| Danger action | 6.4 | 7.8 |
| Focus ring on the page canvas | 4.7 | 9.2 |

**Sampler limits:** the selected onboarding choice reports 1:1 because its edge sits on a nested span; it was measured by hand (above). Native radio and checkbox glyphs are rendered by the browser and are not sampled. Text over artwork is reported against the nearest painted colour, not the picture, so the scene-stage scrim rule in the [contrast contract](#contrast-contract) is what guarantees it.

### Navigation map

Every explicit back control today is a hard-coded forward `<Link>`. None restore scroll, and no list item on a day page has an anchor, so returning to "the same movement" is impossible. Only the browser's Back button restores position.

| Drill-down | Trigger | Back control on the destination | Returns to the exact origin? | Deep-link fallback |
|---|---|---|---|---|
| Landing → `/try` | `page.tsx:19` | None; the finish step only links forward to `/app` and `/program` | n/a (browser Back only) | n/a |
| Landing → `/program`, `/library`, `/progress` | Shell nav | None (top-level tabs) | n/a | n/a |
| `/program` → `/program/[day]` | `program-explorer.tsx:24` | "Example routine" → `/program?equipment=` | Partial: equipment kept; scroll and day position lost | Dumbbells |
| `/program/[day]` → `/library/[slug]` | `program/[day]/page.tsx:52`, no `returnTo` | "Exercise library" → `/library?equipment=`; the shell also switches the active tab to Library | **No**: the day is lost | Library |
| `/library` → `/library/[slug]` | `library/page.tsx:95–99` sends `returnTo` | "Exercise library" | Partial: equipment kept; **search `q` dropped** because `returnTo` is never read | Library |
| `/sample-workout` → guide | `sample-workout/page.tsx:66–73` sends `returnTo` | "Exercise library" | **No**: `returnTo` ignored | Library |
| `/program/[day]` → `/sample-workout` | `program/[day]/page.tsx:55`, no day or equipment | "{Day} day" → always Push | **No**: back link points to the wrong day | Push, dumbbells |
| Guide → demo video | Inline player on the guide | n/a | Yes (same page) | "No video yet" |
| Today → `/app/program/[day]` | `member-program-home.tsx:112,129` | "Today" → `/app` | Partial: the day picker resets to Day 1; scroll lost; the nav highlights Routine | `/app` |
| Day → `/app/library/[slug]` | `app/program/[day]/page.tsx:54` "Details" | "Library" → `/app/library` | **No**: day, movement and scroll lost | `/app/library` |
| Day → custom movement | `app/program/[day]/page.tsx:56` | "Custom library" | **No** | Same |
| Today or day → runner | `start-workout-control.tsx:47` | "Back to Today"; "Leave for now" → `/app` | Partial: lands on Today even when started from a day; re-entering restores the exact exercise and set | Recovery state |
| Runner → guide or video | Video is inside a **collapsed `<details>`**; the route bar "Library" link leaves the workout | Library → `/app/library`, with no way back to the runner except Today's resume card | Video yes; Library **no** | n/a |
| Runner → history after finish | `owned-workout-runner.tsx:126–128` | "Back to history" | n/a; no completion moment, no "Back to Today" | `/app/history` |
| Routine editor → movement chooser | Modal dialog | "Close"; focus returns to the trigger | **Yes** | n/a |
| Editor → `/app/programs` | `program-editor.tsx:1044` | "Back to Today" | **No**: editor origin lost | `/app` |
| `/app/programs` → editor | `program-collection.tsx:382` | "All routines" / "Back to Today" | Partial: always opens on Day 1 | `/app` |
| Member Library → guide | `app/library/page.tsx:117` | "Library" | Partial: **`q` lost** | `/app/library` |
| Library → custom new or edit | `app/library/page.tsx:60,96` | "Custom library" | **No** from `/app/library` | `/app/library/custom` |
| History → detail | `history/page.tsx:106` | "Back to history" | Partial: filter and page lost | `/app/history` |
| Progress → history or detail | `progress-insights-view.tsx:74,111` | "Back to history" | **No**: came from Progress, goes to History | `/app/history` |
| Progress → Records | `progress-insights-view.tsx:27` | "Back to progress" | Yes, apart from scroll | `/app/progress` |
| Records → source workout | `personal-records-view.tsx:67` | "Back to history" | **No**: the record is lost | `/app/history` |
| Settings | Header icon | No back control; sections have no linked anchors | n/a | n/a |
| Sign-in `returnTo` | `app/layout.tsx:24`, `proxy.ts:27` | Server-normalized | **Yes** for `/app…` paths | `/app` |

**Gaps, most severe first:** (1) the public guide ignores `returnTo` even though a validated resolver (`resolvePublicExerciseReturn`) exists and is unit-tested; (2) the member guide always says "Library"; (3) the runner can't open the full guide without leaving the workout, and its demo hides in a collapsed disclosure; (4) day pages pass no origin and have no movement anchors; (5) Library search is lost after a guide; (6) history detail always returns to History; (7) Today's day picker and the editor's selected day reset on every round trip; (8) most back links don't match their origin; (9) every back control is a forward push, so scroll is never restored.

**Reusable pieces:** `resolvePublicExerciseReturn` and `exerciseDetailHref` (`src/domain/navigation/public-exercise-return.ts`), `normalizeReturnPath` (`src/server/navigation/return-path.ts`), `ExerciseGuide`'s existing `backHref`/`backLabel` props, `workoutRoutePath` (`src/client/owned-workout.ts:120`), the proxy's `x-mwp-pathname` header, and `CuratedVideoPlayer`, which is self-contained and safe to mount in a sheet (unmount it on close so a hidden frame never keeps playing).

### Onboarding walkthrough

#### New guest

| Step | What they see | Helps the first-time reaction? |
|---|---|---|
| Landing | "A little space for your next set." Copy about a routine and "a place to keep the work". **Try one set**, **Create my routine**, a three-item list (build, train, see the work add up), and a link to the five-day example | **Partly.** Routine and progress are hinted at. Videos never appear; "keep guidance nearby" is too abstract |
| `/try` step 1 | "Practice only. Nothing is saved." "Try one set." Push-up, target 10 reps, a reps field, **Log set & rest** | **Tracking only.** No demo, even though it's a movement people ask about. Push-up has **no approved video**, so it can't show one |
| `/try` step 2 | "Take a moment." A 30-second rest timer, Pause, Add 30 seconds, **Finish practice** | **Tracking mechanics only** |
| `/try` step 3 | "That's the rhythm." **Set up my routine** (→ sign-in) or the five-day example | **Weak.** Doesn't connect the set to progress; jumps to a sign-in wall |
| `/program` | Five-day example with an equipment toggle and day cards | **Routine only.** Push/Pull/Legs/Upper/Lower is jargon to a beginner, with no goal framing |
| `/progress` | Example charts with an "Example data" badge | **Progress only**, and nothing links to it from the trial |

#### New member (no routine yet)

| Step | What they see | Persisted | Helps? |
|---|---|---|---|
| Header | "Make room for your routine." "Choose a starting point. Make it yours as you go." Pip in a masked scene | — | Routine only |
| 1 of 3 | "Where would you like to start?" **Example routine** (five editable days) or **Blank routine** (empty draft) | — | **Assumes knowledge.** A beginner can't judge this. No goal, experience or schedule questions |
| 2 of 3 | "Your preferences": units, time zone, a Motion disclosure | `user_preferences` | **None.** Settings chores before any value |
| 3 of 3 | "Equipment and review": Dumbbells or Barbell + rack; for Blank, a catalog search for a first movement; **Save routine** | `user_profiles`, `user_preferences`, `user_equipment_profiles`, a cloned five-day program or a one-movement blank program, all in one transaction (`onboardViewer`, `profile-program.ts:2587–2715`) | Equipment fit only. Blank mode makes a novice search a catalog |
| Today afterwards | "Ready when you are, {name}." Next workout panel, All days list. Progress appears only after the first finished workout | — | Routine and tracking. No videos, no explanation of the four pillars |

**Why it fails the brief:** nobody is asked what they're training for, the routine isn't fitted to anything they said, the video pillar is invisible until they open a guide, and progress is invisible until after a finished workout.

#### Machinery available

- `createStarterProgram(profile)` (`src/domain/programs/starter.ts:165`) and the five-day template seed (`src/domain/seed/starter-database.ts:230`), with dumbbell and barbell profiles.
- Onboarding clones database template rows (`loadTemplateGraph`, `cloneTemplateRevision`) or inserts a minimal blank program (`insertMinimalPublishedProgram`, `profile-program.ts:778`).
- `onboardingRequestSchema` (`src/server/http/profile-program-api.ts:19`) and `onboardingSchema` (`profile-program.ts:391`) are both `.strict()`; new fields must be added to both, to the idempotency hash and to the client body.
- The latest migration is `drizzle/0007_personal_guidance.sql`.
- **Approved demos:** 54 approved videos, exactly two each for **27 movements**, which are exactly the five-day starter's movements (for example goblet squat, dumbbell bench press, one-arm dumbbell row, dumbbell Romanian deadlift, reverse lunge, front plank, dead bug, bird dog). Push-up has none.

### Art inventory

All scene files are 1200 × 800 with a 600 × 400 phone derivative. Character sheets are 320 × 320 and **opaque** (cream background, no alpha).

| File | Shows | Used in | How |
|---|---|---|---|
| `quiet-set/dawn-studio` | Empty bright gym, cream wall on the left, windows on the right | Landing hero; faded backdrop for member and workout pages | Landing: beside a cream copy plate (below the copy on phones). Member: backdrop that fades to paper by 720px, **replaced by plain paper whenever a companion is mounted** |
| `quiet-set/evening-studio` | Twilight version | Dark landing and dark member backdrop | Same slots |
| `quiet-set/pip-studio`, `mica-studio` | Pip (stoat) or Mica (kingfisher) welcoming in the gym | Today and onboarding (`DecorativeCompanion variant="member-home"`) | Masked scene beside the heading; 30% wide on phones. Dimmed in dark mode |
| `quiet-set/otter-study` | Otter on a bench studying a guide | Public and member Library, custom movement editor | Masked heading scene |
| `quiet-set/beaver-plan` | Beaver planning at a desk | Routine editor (calm states only), routines list | Masked heading scene |
| `quiet-set/tortoise-review` | Tortoise reviewing a journal | Public Progress, member Progress, History, history detail, Records | Masked heading scene |
| `quiet-set/hare-prepare` | Hare packing a gym bag | Settings (calm states only) | Masked heading scene |
| `quiet-set/pip-recover` | Pip resting on a bench with water | Member day page; a 150 × 95 runner slot that is hidden during logging, timers, saves and completion | Masked heading scene / tiny corner |
| `quiet-set/pip-ready`, `pip-resting`, `pip-complete`, `mica-ready`, `mica-resting`, `mica-complete` | Single-character pose sheets on cream | **Not used in the UI.** Still downloaded by the service worker | — |
| `companions/*` (16 files) | Earlier storybook-style transparent cut-outs (hedgehog, otter, raccoon, fox, beaver, tortoise, hare, bear) | **Not used.** 6 are still in the service-worker cache | Style was retired on September 4 |
| `workout-pals-gym(-768)` | Busy gym full of animals | **Not used** | — |

**Screens with no art at all:** `/try`, `/program`, `/program/[day]`, `/sample-workout`, `/sign-in`, `/library/[slug]`, `/offline`, not-found and the end of a workout. **24 of 42 files are unused**, and 12 unused files are still fetched by the service worker on install.

**Companion preference:** `pip | mica | off` in `localStorage` (`mwp:companion:v1`), read only by `DecorativeCompanion`. Only Today and onboarding honour Pip versus Mica; every other placement shows its fixed character. The server always renders Pip first, so Mica and Off users see a brief swap.

---

## Phase 1: the new direction

### Direction in one paragraph

**Studio Pals.** The app lives *inside* the illustrated studio. Every page opens on a full-bleed scene: the bright daytime studio in light mode, the evening studio in dark mode. Your pal (Pip or Mica) stands in the room and reacts to what's happening: ready on Today, catching their breath while you rest, cheering when you finish or set a record. Text sits straight on the scene's cream wall or on a soft scrim that fades into it, never in a white card. Below the scene, content is grouped by whitespace, rounded headings and open rows. The palette warms up: sunshine yellow for the main action, teal from the gym equipment for links and selection, tangerine for celebrations, all on warm cream (or deep evening teal in dark mode). Buttons are chunky, rounded "sticker" shapes that press down when tapped. Motion is small and earned: a pal hops in, a set gets a check pop, a finished workout gets a short confetti burst. Everything stays still when reduced motion is on.

### Visual system

#### Environment instead of boxes

- **Scene stage.** Each primary page starts with a `SceneStage`: a full-width illustrated backdrop that extends behind the header. Desktop: 560–640px tall, cover-cropped so the character stays in frame. Phone: 300–360px, with a phone-specific crop that keeps the character visible.
- **Copy on the wall.** Headings and the first action sit on the scene's cream wall (left on desktop, bottom on phones). Where the wall isn't calm enough, a **scrim** (a gradient from the page colour at 92% opacity to transparent) guarantees contrast. In dark mode the same scrim uses the evening canvas colour, so light text is always on a dark ground. Text never relies on the picture behind it for contrast.
- **The floor.** Below the scene, the page colour continues as the "floor". Sections are separated by generous space (48–72px), a rounded display heading and, where a group needs a visual edge, a **soft group**: a 4–8% tint of the floor colour with no border and no shadow. Nested containers are not allowed.
- **Boxes that stay** are the functional ones from the box inventory's K rows: form fields, the active set entry, the rest timer, dialogs and sheets, selected states, errors, and the phone tab bar.
- **Header.** Transparent over the scene. The brand and navigation become rounded pills; the active pill uses the selected-state tokens. On phones the member tab bar stays a solid bar for legibility.

#### Palette and tokens

Text-bearing fills are either very light (with dark ink) or very dark (with light ink). **A mid-tone never carries text**, in any state.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas` | `#fff8ec` warm cream | `#14201e` evening teal | Page and scene wall |
| `--floor` | `#f7e6c4` honey | `#1d2a27` | Soft groups, floor wash |
| `--surface` | `#ffffff` | `#22312e` | Fields and sheets only |
| `--ink` | `#1d2b28` | `#fbf3e4` | Text |
| `--ink-soft` | `#4b5a55` | `#c8c0b0` | Secondary text |
| `--brand` | `#0f6b66` teal | `#6fd6cc` | Links, icons, selected edges |
| `--sun` / `--on-sun` | `#ffc93c` / `#1d2b28` | same | Primary action |
| `--tangerine` / `--on-tangerine` | `#ff8b5c` / `#1d2b28` | same | Celebrations, records |
| `--selected-bg` / `--selected-fg` / `--selected-edge` | `#d9f2ee` / `#1d2b28` / `#0f6b66` | `#164a45` / `#fbf3e4` / `#6fd6cc` | Every selected or current state |
| `--hover-bg` | `#f2ead9` | `#22312e` | Hover on open rows and ghost buttons |
| `--focus` | `#c2410c` | `#ffb27a` | 3px focus ring, 3px offset |
| `--danger` / `--on-danger` | `#b42318` / `#ffffff` | `#ff9b8f` / `#14201e` | Errors, destructive actions |
| `--rule` | `#8a8f86` | `#6f8580` | Field and divider edges |

Measured pairs (WCAG 2.x): ink on canvas 13.9 / 15.2; ink-soft on canvas 6.9 / 9.3; brand on canvas 6.0 / 9.7; ink on sun 9.6; ink on tangerine 6.4; selected text 12.5 / 9.1; selected edge on its fill 5.4 / 5.8; focus ring on canvas 4.9 / 9.5; white on danger 6.6; field edge 3.1 / 4.3. The sun fill against cream is only 1.45:1, so every sun button carries a 2px ink edge (13.9:1).

#### Type

- **Display:** Fredoka (variable, OFL-1.1, self-hosted through `@fontsource-variable/fredoka`), weights 500–650, for headings, numbers in celebrations, and pills. It's round, friendly and readable at a glance. **This adds one dependency; see [open questions](#open-questions-for-the-owner).** Fallback: Source Sans 3 at 700.
- **Body and controls:** Source Sans 3 Variable stays, with tabular numerals for training values.
- Sentence case everywhere. Georgia and the retired Barlow Condensed imports are removed in Phase 2.

#### Shapes and controls

- **Primary action:** pill (`999px`), sun fill, ink text, 2px ink edge, `0 3px 0` ink "ledge". Pressed: moves down 2px and the ledge shrinks.
- **Secondary action:** pill, transparent fill, 2px ink edge.
- **Selected chips and day pills:** `--selected-bg` fill, `--selected-fg` text, 2px `--selected-edge`, plus a check icon or "Selected"/"Today" text, so the state never depends on colour.
- **Fields:** 12px radius, `--surface` fill, 2px `--rule` edge, `--brand` edge when focused (plus the focus ring).
- **Soft groups:** 24px radius, tint only.
- Minimum target 48 × 48px. Equipment choices keep their 80px minimum.

#### Motion (restrained, reduced-motion safe)

| Moment | Motion | Duration |
|---|---|---|
| Scene load | Pal rises 8px and fades in | 320ms, once |
| Button press | Moves down 2px | 90ms |
| Set logged | Check icon pops (scale 0.6 → 1.1 → 1) | 220ms |
| Rest | Timer ring drains; the resting pal breathes (1.5% scale) | Continuous while resting |
| Workout complete / record | 14 CSS confetti shapes burst once; the pal bounces once | 900ms |
| Sheet open | Slides up 24px and fades | 200ms |

All motion sits inside `@media (prefers-reduced-motion: no-preference)` **and** is cancelled by the in-app `data-reduced-motion="true"` preference. Nothing loops except the rest breathing, which stops with either setting.

#### Characters react to moments

| Moment | Where | Art (reused now) | Art wanted (request) |
|---|---|---|---|
| Ready | Landing, Today, onboarding | `pip-studio` / `mica-studio` scene | Evening variants for dark mode |
| Resting | Runner rest timer, trial rest | `pip-resting` / `mica-resting` as a round sticker | Transparent cut-out |
| Complete | New workout-complete moment, trial finish | `pip-complete` / `mica-complete` sticker + confetti | Transparent cut-out |
| Record | Records page, completion summary when a record is set | `pip-complete` + tangerine "New record" ribbon | A pose holding a medal |
| Studying, planning, reviewing, packing | Library, routines, progress, settings scene stages | otter, beaver, tortoise, hare scenes | Evening variants |

The pose sheets are opaque cream, so until cut-outs exist they appear as **round stickers**: the image clipped to a circle on a cream disc with a 3px ink outline. That reads as deliberate in both themes. The Off preference still hides every character; the scenes stay.

#### Artwork

Phase 1 reuses existing files only. The prototype uses `pip-studio`, `mica-studio`, `dawn-studio`, `evening-studio`, `pip-ready` and crops of `beaver-plan`, `pip-recover`, `otter-study` and `tortoise-review`. **No art is generated or committed without approval.** The requests are listed under [open questions](#open-questions-for-the-owner). Any approved new art gets a prompt and hash sidecar in `docs/design/provenance/`, and only served files go under `public/illustrations/`.

Phase 2 also deletes the 24 unused illustration files from `public/` (keeping their provenance) and removes them from the service-worker cache list, unless the owner wants them kept.

### Contrast contract

- **State tokens.** Every interactive state uses the tokens above: default, hover (`--hover-bg`), focus (`--focus` ring), selected/current (`--selected-*`), active (pressed ledge), disabled (`--ink-soft` text on the unchanged fill, dashed `--rule` edge, no opacity fade). No state puts white or cream text on a mid-tone fill.
- **Single source.** Tokens live in `src/design/tokens.ts` (both themes) and are emitted into CSS custom properties by the stylesheet. A unit test reads that module.
- **Automated check, part 1 (unit):** `tests/unit/design-token-contrast.test.ts` checks every declared text/background pair for every state in both themes: 4.5:1 for text, 3:1 for large text, focus rings and component edges. It fails the build if a token changes into a failing pair.
- **Automated check, part 2 (browser):** `tests/e2e/state-contrast.spec.ts` (public) and `tests/authenticated-e2e/state-contrast.spec.ts` (member) promote the capture-kit sampler into a test. On each key screen they measure default, hover, keyboard focus, selected/current and disabled states in light and dark, and fail on any pair below the thresholds. Text over artwork must sit on a scrim; the sampler treats the scrim colour as the background and checks it is at least 90% opaque.

### Navigation contract

**Rule:** every drill-down shows a visible back control at the top, labelled with where it goes, and it returns to the exact origin.

1. **Origin travels with the link.** Drill-down links add a validated `from` parameter, for example `/app/library/goblet-squat?from=/app/program/push%23movement-3`.
2. **Anchors exist.** Day movements get `id="movement-{n}"`, Library rows `id="movement-{slug}"`, history rows `id="session-{id}"`, records `id="record-{slug}"`, runner exercises `id="exercise-{n}"`.
3. **One resolver.** A pure `resolveBackTarget(from, fallback)` in `src/domain/navigation/back-target.ts` accepts only allowlisted origins and returns `{ href, label }`. Labels are human: "Back to Day 2 · Push", "Back to Library", "Back to your workout", "Back to Progress", "Back to your records", "Back to History", "Back to Today", "Back to the test drive". It rejects external, protocol-relative, encoded-control and unknown paths. **TDD.**
4. **One component.** `BackLink` renders the labelled control (arrow icon, ≥48px target). When the browser's previous entry is the same origin (tracked in `sessionStorage`), it calls `history.back()`, so scroll comes back natively. Otherwise it navigates to the resolved `href` with its anchor, scrolls the anchored item into view and moves focus to it.
5. **Deep links without an origin** fall back to the sensible parent: guide → Library (with the equipment filter on public pages), day → Today, history detail → History, record source → Records, runner → Today.
6. **The tab bar follows the origin.** A day opened from Today keeps Today highlighted.
7. **Videos open in place.** A `DemoSheet` (bottom sheet on phones, side sheet on desktop, built on the native `<dialog>`) wraps `CuratedVideoPlayer`. It appears wherever a movement is listed: Today's movement list, day pages, the runner (replacing the collapsed details), the Library list and the trial. Closing it (✕, Escape or swipe-down on phones) returns focus to the trigger and **unmounts the iframe**, so nothing plays hidden. Only approved pairs are passed in; movements without one show "No demo yet" with the written steps. The guide page keeps its inline player.
8. **Selected state survives round trips.** Today's selected day and the editor's selected day live in the URL (`?day=push`).

| Drill-down | Back label | Returns to |
|---|---|---|
| Today → day | Back to Today | Today, same selected day |
| Day → guide | Back to Day 2 · Push | Day page at that movement |
| Day/Today/runner → demo | (sheet) Close | Same spot, focus on the trigger |
| Runner → full guide | Back to your workout | Runner at the same exercise and set |
| Library → guide | Back to Library | Library with the same search and filter, at that row |
| Progress → workout | Back to Progress | Progress at that row |
| Records → source workout | Back to your records | Records at that record |
| History → workout | Back to History | History, same filter and page, at that row |
| Finish workout → summary → history | Back to Today | Today |
| Routines → editor → chooser | Back to Routines / Close | Same routine, same day |
| `/program` → day → guide (public) | Back to the Push day | Day page at that movement |
| Trial → demo | (sheet) Close | Same step |

### Onboarding redesign

#### Member flow (replaces the three-step example/blank form)

The person should leave with a routine that fits them and a picture of the four pillars. Each step is one question on one screen, with the pal in the scene stage. A progress dot row shows "Step 2 of 5". Focus moves to each new heading. Back is always available.

1. **"What are you training for?"** Choose one: *Get stronger* · *Build muscle* · *Feel fitter overall* · *Lose fat* · *Train for a sport or event*.
2. **"How much lifting have you done?"** *I'm new to this* (under 6 months) · *Some* (6 months to 2 years) · *Lots* (2+ years).
3. **"How many days a week can you train?"** 2 · 3 · 4 · 5. Helper: "Pick what you can keep up. You can change it later."
4. **"What do you have to work with?"** *Dumbbells, a bench and bodyweight* · *A full gym with a barbell and rack*. (The existing two equipment profiles.)
5. **"Here's your routine."** A preview of the generated routine: its name (for example "3-day full body"), each day with its movements and set × rep targets, and a ▶ on each movement that has an approved demo. Actions: **Save my routine** · "Start from a blank routine instead". Units default from the browser locale with a small "Pounds · change" toggle; the time zone is detected silently; motion follows the system. All three stay editable in Settings.
6. **Tour (skippable, four short cards, "Skip tour" always visible):**
   - *Today:* "Your next workout is always here. Tap Start when you're ready."
   - *Logging:* an animated sample set row: "Log what you actually did. Your rest timer starts on its own."
   - *Demos:* an approved demo for the first movement in their routine: "Not sure how a move goes? Watch a quick demo. It opens right where you are."
   - *Progress:* a small chart built from friendly sample data, labelled "Example": "Every set adds up here: your workouts, your records, your gains."
   - Finish: "You're all set." → Today, with Day 1 selected.

#### Routine generation (domain, TDD)

`generateStarterRoutine({ goal, experience, daysPerWeek, equipment })` in `src/domain/programs/generate-routine.ts` returns a draft program built only from the 27 catalog movements that have approved demos and are compatible with the chosen equipment. It never sets a target weight (the app doesn't prescribe load).

| Days | Split |
|---|---|
| 2 | Full body A, Full body B |
| 3 | Full body A, B, C (*Lots* of experience: Push, Pull, Legs) |
| 4 | Upper, Lower, Upper, Lower |
| 5 | Push, Pull, Legs, Upper, Lower (the existing starter) |

| Goal | Main lifts | Accessories | Rest | Extras |
|---|---|---|---|---|
| Get stronger | 3–4 × 4–6 | 2–3 × 8–10 | 150s | — |
| Build muscle | 3–4 × 8–12 | 3 × 10–15 | 90s | — |
| Feel fitter overall | 3 × 8–12 | 2 × 12–15 | 75s | 15-minute walk or run finish |
| Lose fat | 3 × 10–15 | 2 × 12–15 | 60s | 20-minute walk or run finish |
| Train for a sport or event | 3 × 5–8 | 2 × 8–12 + core | 90s | Core section on every day |

Experience sets the size of each day: *new* 4 movements and the lower set count, *some* 5, *lots* 6 and the higher set count. Output is deterministic for the same answers. Tests cover every combination for valid structure, equipment compatibility, approved-demo coverage, no load targets and stable naming.

#### Persistence and ownership

- **New table** `user_training_profiles` (additive migration `0008_training_profile`): `owner_firebase_uid` (PK, FK to `user_profiles`, cascade delete), `training_goal` enum (`strength`, `muscle`, `general`, `fat_loss`, `sport`), `experience_level` enum (`new`, `some`, `lots`), `days_per_week` smallint with a check of 2–5, `created_at`, `updated_at`. One row per member, nullable for members who onboarded before this change.
- **Onboarding envelope:** add `mode: "generated"` with a strict `trainingProfile` object. The server regenerates the routine from the answers and equipment. It never accepts a client-built routine. Ownership comes only from the verified session; the client never sends a UID. The idempotency hash includes the new fields.
- **Settings:** a "Your training" section shows and edits the answers. Changing them does **not** rewrite the active routine. It offers "Build a new routine from these answers", which creates a new routine in Routines and asks before making it active. History and existing routine revisions are untouched.
- **Account deletion** removes the new row in the same transaction (covered by the existing owner-scoped deletion test, extended).
- **Migration steps for the owner (not run against production by the agent):**
  1. Review `drizzle/0008_training_profile.sql`.
  2. Take the usual pre-migration backup.
  3. Run `pnpm db:migrate` against production.
  4. Run `pnpm db:verify` and confirm the new table with zero rows.
  5. Merge the application change only after the migration is live (the read path tolerates a missing row, so the order is safe either way).

#### Guest test drive (replaces "Try one set")

`/try` becomes **"Take a 3-minute test drive"**: a guided taste of a real workout, with a one-line "Test drive. Nothing is saved." note at the top.

1. **Meet today's workout.** Two movements with approved demos: *Goblet squat* (3 × 8–12) and *Front plank* (2 × 20–45s). Short labels explain each part: "This is your plan for today", "Targets are a guide, not a rule".
2. **Watch the demo.** "Not sure how it goes? Watch a quick demo." It opens in the `DemoSheet`, right there.
3. **Log a set.** Weight and reps, with "Log what you actually did."
4. **Rest.** The rest timer with the resting pal sticker: "Catch your breath. Your next set is ready when you are."
5. **Next movement.** Front plank, logged as time.
6. **Done!** The complete pal, a confetti burst, and a mini summary of what they logged, followed by a peek at Progress built from their entries and labelled "Example". **Make my routine** (→ sign in, then onboarding) or **Look around first** (→ Library).

Demos come from the approved pairs for those two movements. If either pair is missing, the step shows "No demo yet" with the written steps, and the trial still works.

### Copy direction

Warm, short, second person, a little playful, never cute at the expense of clarity. Examples:

| Where | Today | New |
|---|---|---|
| Landing heading | A little space for your next set. | Your new gym buddy. |
| Landing intro | Your routine, a clear next step, and a place to keep the work you put in. | Plan your routine, log every set, watch a quick demo when you need one, and see your gains add up. |
| Landing primary | Try one set | Take a test drive |
| Landing secondary | Create my routine | Make my routine |
| Today greeting | Ready when you are, Alice QA. | Hey Alice! Ready for Push? |
| Today start | Start workout | Start Push |
| Demo trigger | Watch demo and technique guidance | ▶ Watch demo |
| Rest | — | Catch your breath. |
| Finish | (jumps to history) | Workout done! Nice work. |

The existing copy rules still hold: no implementation vocabulary, one name per concept (routine, workout, movement, Library, Today, Progress, Settings), no repeated disclaimers, and the truthful constraints stated once where they matter.

### Responsive and accessibility notes

- Check 390px and 1440px in both themes for overlap, clipping and horizontal scroll. The scene stage never pushes the primary action below the first phone screen.
- Scene art stays decorative: empty `alt`, `aria-hidden`, no focus or pointer target. Image failure collapses the stage to a solid canvas.
- Forced colours: scenes and stickers are removed, scrims are dropped, and system colours take over.
- Sheets are native `<dialog>` elements with a labelled close button, focus trapping and focus return.
- Every announcement (set logged, rest done, step changed) goes through one polite live region.

### Prototype scope (Phase 1)

Only two screens: the **landing page** and **member Today**, at 390px and 1440px, light and dark.

- New tokens and type are scoped to the prototype pages (`.pal` on the page root, with the member header restyled through `:has(.pal-today)`), so the other screens stay unchanged until Phase 2.
- Today shows the selected day's movements with ▶ demo triggers that open the `DemoSheet` (prototype version), day pills instead of the select, an open stat row, and the scene stage with the selected pal.
- Today's selected day is kept in the address (`/app?day=push`), so returning to Today lands on the same day.
- The prototype stylesheet `src/app/studio-pals.css` loads after Quiet Set and overrides it inside the two scopes. That is deliberate scaffolding for review only: Phase 2 moves the tokens to `:root`, folds the rules into one stylesheet and deletes the Quiet Set rules they replace, as `AGENTS.md` requires.
- The "Take a test drive" button still opens today's one-set trial until Phase 2 builds the test drive.
- `DESIGN.md` still describes Quiet Set, because it documents the shipped source. Phase 2 rewrites it as *Studio Pals* from the [visual system](#visual-system) above once the direction is approved.
- Tests that check the retired landing and Today layouts are expected to fail on the prototype branch. Nothing is merged before Phase 2. On the prototype commit, `pnpm typecheck`, `pnpm lint` and `pnpm docs:check` pass, and Vitest reports 959 passed and 6 failed. All 6 failures check the retired layouts: `landing-page.test.tsx` (2, old hero copy and image), `member-program-home.test.tsx` (3, the old start panel, select and resume card) and one `authenticated-harness-policy.test.ts` source check for the retired "All days" links. Phase 2 updates them under the ledger rules. Browser suites were not run on the prototype.

### Prototype screenshots

Captured from a production build (landing) and the synthetic member fixture (Today), at 390 × 844 and 1440 × 1000. Long pages are cropped to their first 2,400 CSS pixels. The YouTube frame is an inert local placeholder. No capture shows horizontal overflow.

| Screen | Phone light | Phone dark | Desktop light | Desktop dark |
|---|---|---|---|---|
| Landing | [phone light](../design/playful-overhaul/prototype/landing-phone-light.jpg) | [phone dark](../design/playful-overhaul/prototype/landing-phone-dark.jpg) | [desktop light](../design/playful-overhaul/prototype/landing-desktop-light.jpg) | [desktop dark](../design/playful-overhaul/prototype/landing-desktop-dark.jpg) |
| Today | [phone light](../design/playful-overhaul/prototype/member-today-phone-light.jpg) | [phone dark](../design/playful-overhaul/prototype/member-today-phone-dark.jpg) | [desktop light](../design/playful-overhaul/prototype/member-today-desktop-light.jpg) | [desktop dark](../design/playful-overhaul/prototype/member-today-desktop-dark.jpg) |
| Today, demo open in place | [phone light](../design/playful-overhaul/prototype/member-today-demo-phone-light.jpg) | [phone dark](../design/playful-overhaul/prototype/member-today-demo-phone-dark.jpg) | [desktop light](../design/playful-overhaul/prototype/member-today-demo-desktop-light.jpg) | [desktop dark](../design/playful-overhaul/prototype/member-today-demo-desktop-dark.jpg) |
| Today after a first workout (no approved demo for Push-up) | [phone light](../design/playful-overhaul/prototype/member-today-after-workout-phone-light.jpg) | [phone dark](../design/playful-overhaul/prototype/member-today-after-workout-phone-dark.jpg) | [desktop light](../design/playful-overhaul/prototype/member-today-after-workout-desktop-light.jpg) | [desktop dark](../design/playful-overhaul/prototype/member-today-after-workout-desktop-dark.jpg) |

Matching baseline images from `main` (the full set is in [`before/`](../design/playful-overhaul/before/)):

| Screen | Phone light | Phone dark | Desktop light | Desktop dark |
|---|---|---|---|---|
| Landing | [phone light](../design/playful-overhaul/before/landing-phone-light.jpg) | [phone dark](../design/playful-overhaul/before/landing-phone-dark.jpg) | [desktop light](../design/playful-overhaul/before/landing-desktop-light.jpg) | [desktop dark](../design/playful-overhaul/before/landing-desktop-dark.jpg) |
| Try one set | [phone light](../design/playful-overhaul/before/try-phone-light.jpg) | [phone dark](../design/playful-overhaul/before/try-phone-dark.jpg) | [desktop light](../design/playful-overhaul/before/try-desktop-light.jpg) | [desktop dark](../design/playful-overhaul/before/try-desktop-dark.jpg) |
| Five-day example | [phone light](../design/playful-overhaul/before/program-phone-light.jpg) | [phone dark](../design/playful-overhaul/before/program-phone-dark.jpg) | [desktop light](../design/playful-overhaul/before/program-desktop-light.jpg) | [desktop dark](../design/playful-overhaul/before/program-desktop-dark.jpg) |
| Library | [phone light](../design/playful-overhaul/before/library-phone-light.jpg) | [phone dark](../design/playful-overhaul/before/library-phone-dark.jpg) | [desktop light](../design/playful-overhaul/before/library-desktop-light.jpg) | [desktop dark](../design/playful-overhaul/before/library-desktop-dark.jpg) |
| Sign in | [phone light](../design/playful-overhaul/before/sign-in-phone-light.jpg) | [phone dark](../design/playful-overhaul/before/sign-in-phone-dark.jpg) | [desktop light](../design/playful-overhaul/before/sign-in-desktop-light.jpg) | [desktop dark](../design/playful-overhaul/before/sign-in-desktop-dark.jpg) |
| Onboarding step 1 | [phone light](../design/playful-overhaul/before/member-onboarding-1-phone-light.jpg) | [phone dark](../design/playful-overhaul/before/member-onboarding-1-phone-dark.jpg) | [desktop light](../design/playful-overhaul/before/member-onboarding-1-desktop-light.jpg) | [desktop dark](../design/playful-overhaul/before/member-onboarding-1-desktop-dark.jpg) |
| Today | [phone light](../design/playful-overhaul/before/member-today-phone-light.jpg) | [phone dark](../design/playful-overhaul/before/member-today-phone-dark.jpg) | [desktop light](../design/playful-overhaul/before/member-today-desktop-light.jpg) | [desktop dark](../design/playful-overhaul/before/member-today-desktop-dark.jpg) |
| Day | [phone light](../design/playful-overhaul/before/member-day-phone-light.jpg) | [phone dark](../design/playful-overhaul/before/member-day-phone-dark.jpg) | [desktop light](../design/playful-overhaul/before/member-day-desktop-light.jpg) | [desktop dark](../design/playful-overhaul/before/member-day-desktop-dark.jpg) |
| Workout | [phone light](../design/playful-overhaul/before/runner-set-entry-phone-light.jpg) | [phone dark](../design/playful-overhaul/before/runner-set-entry-phone-dark.jpg) | [desktop light](../design/playful-overhaul/before/runner-set-entry-desktop-light.jpg) | [desktop dark](../design/playful-overhaul/before/runner-set-entry-desktop-dark.jpg) |
| Progress | [phone light](../design/playful-overhaul/before/member-progress-phone-light.jpg) | [phone dark](../design/playful-overhaul/before/member-progress-phone-dark.jpg) | [desktop light](../design/playful-overhaul/before/member-progress-desktop-light.jpg) | [desktop dark](../design/playful-overhaul/before/member-progress-desktop-dark.jpg) |

---

## Phase 2: rollout (after approval)

1. Promote the tokens to `:root`, apply the scene stage and open layouts to every public and member screen, and **delete** the box CSS listed as R and M in the inventory rather than overriding it. Retire `quiet-set.css` into the new stylesheet and delete dead rules.
2. Build `BackLink`, `resolveBackTarget`, anchors and `DemoSheet` everywhere in the navigation table (TDD for the resolver).
3. Build `generateStarterRoutine` (TDD), migration `0008`, the onboarding envelope, the new onboarding steps and tour, and Settings > Your training.
4. Build the guest test drive.
5. Add the workout-complete moment and the record celebration.
6. Mirror every page change in `tests/fixtures/authenticated-app`.
7. **Existing tests:** update a test only when the redesign deliberately retires the layout it checks. Keep its behavioural intent and every numeric threshold (overlap, overflow, target size). Log each edit in the QA report as `file:line old → new`, tagged `playful-overhaul`. No skips, retries or longer timeouts. A test that passed before and now fails because of a real regression means the app gets fixed.
8. New browser tests: onboarding (guest and member, including Skip tour), back navigation from video, guide, day and record views to the exact origin, and selected-state contrast.

---

## Acceptance criteria

1. **First impression.** At 390px and 1440px in both themes, the landing page names all four pillars (routine, tracking, demos, progress) above or just below the first screen, with a pal in the scene and no white cards.
2. **No nested boxes.** No screen has a filled or bordered container inside another, except dialogs and sheets containing fields. Every R row in the box inventory is gone, and its CSS is deleted.
3. **Contrast.** Every text/background pair in every state (default, hover, focus, selected, active, disabled) is at least 4.5:1 (3:1 for large text), and every focus ring and component edge is at least 3:1, in both themes, measured by both automated checks.
4. **Navigation.** Every drill-down in the navigation table shows its labelled back control and returns to the exact origin (same day, movement anchor, search, filter, page, set). Deep links fall back to the listed parent. No video playback takes the person off the page they were on.
5. **Onboarding.** A new member answers goal, experience, days and equipment, gets a routine that matches the generator's rules, and can skip the tour at any point. A guest can finish the test drive, including a demo, without signing in. Only approved demos appear.
6. **Persistence.** New answers are stored only through the server-derived owner, survive reload, are editable in Settings, and are deleted with the account. Changing them never rewrites the active routine or history.
7. **Motion.** Every animation is absent with reduced motion from either the system or the app preference.
8. **Characters.** The pal reacts at ready, resting, complete and record moments. Off hides every character and keeps every function.
9. **Gates.** `pnpm verify`, `pnpm test:e2e:authenticated`, `pnpm test:e2e:release`, the public acceptance run and `pnpm docs:check` all pass on the final commit. Vercel checks pass. The owner approves the final screenshots.

## Tests and evidence

| Rule | Test (written first, fails, then passes) |
|---|---|
| Routine generation from answers | `tests/unit/generate-routine.test.ts` |
| Back-target resolution | `tests/unit/back-target.test.ts` |
| Token contrast in every state | `tests/unit/design-token-contrast.test.ts` |
| Onboarding envelope and ownership | `tests/unit/onboarding-training-profile.test.ts`, `tests/integration/training-profile-repository.test.ts` |
| Migration 0008 | `tests/integration/training-profile-schema.test.ts` (added to `db:check`) |
| Member onboarding and tour skip | `tests/authenticated-e2e/playful-onboarding.spec.ts` |
| Guest test drive | `tests/e2e/test-drive.spec.ts` |
| Back navigation to the exact origin | `tests/e2e/back-navigation.spec.ts`, `tests/authenticated-e2e/back-navigation.spec.ts` |
| Selected-state contrast in the browser | `tests/e2e/state-contrast.spec.ts`, `tests/authenticated-e2e/state-contrast.spec.ts` |

Phase 2 evidence goes in `docs/qa/latest/PLAYFUL-OVERHAUL-QA.md` with screenshots in `docs/qa/latest/playful-overhaul/`, replacing the production-grade evidence (390px and 1440px, light and dark): gates with exact output lines, the edit ledger, the contrast table, the navigation map before and after, and anything noticed but not changed.

## Open questions for the owner

1. **Direction.** Approve *Studio Pals* (scene-led layout, warm palette, chunky rounded controls, reacting pals) or send changes. *Recommendation: approve, then adjust details on the real screens.*
2. **Display font.** Add Fredoka (OFL, self-hosted, one new dependency, about 60 KB)? *Recommendation: yes. The alternative, Source Sans 3 Bold for headings, works but feels much less playful.*
3. **Artwork requests** (nothing is generated without approval):
   - **a. Transparent cut-outs of Pip and Mica, at least 1024px,** in four poses: ready/waving, resting with water, celebrating (arms up), and holding a medal for records. *Why:* the existing pose sheets are 320px and opaque cream, so they can only appear as small round stickers. Cut-outs could stand on the scene floor in both themes.
   - **b. Evening versions of `pip-studio` and `mica-studio`.** *Why:* dark mode currently dims the daylight scene, which looks muddy, and the dark landing can't show a pal.
   - **c. A wide studio panorama (about 2400 × 1000), day and evening.** *Why:* 1440px desktops upscale the 1200px scenes by 20%.
   - **d. Optional:** four small spot illustrations for the pillars (planning, logging, watching a demo, progress). The prototype crops existing scenes instead.
4. **Unused art.** Delete the 24 unused illustration files from `public/` and the service-worker cache (keeping provenance)? *Recommendation: yes.*
5. **Equipment.** Add a "Just bodyweight" equipment option to onboarding? It needs a new equipment profile and substitution rules, and the approved demos include only a few bodyweight movements. *Recommendation: not in this iteration.*
6. **Migration.** Approve the additive `0008_training_profile` table and the owner-run migration steps above. *Recommendation: approve.*
