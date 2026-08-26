# Guest landing and contextual navigation plan

## User outcome

A visitor can understand My Workout Pal before entering the application, browse every starter day and exercise resource without an account, and return from exercise details to the exact public context that opened them. Sign-in copy distinguishes optional account benefits from public access.

## Navigation

- `/` becomes the public welcome page.
- `/program` becomes the five-day guest program overview for both equipment profiles.
- `/program/push`, `/program/pull`, `/program/legs`, `/program/upper`, and `/program/lower` remain public day routes.
- Public day and library links pass a validated `returnTo` context to `/library/[slug]`.
- Exercise details derive their back destination and label from an allowlisted public route. Missing, malformed, encoded-control, external, authentication, and unknown destinations fall back to the public library.
- Public brand links open the welcome page. Program navigation opens `/program`.
- Authentication returns remain separate and continue to use the existing server-normalized `returnTo` contract.

## UI states

The welcome page includes a loaded hero, a reserved image frame during loading, useful alternative text, a clear primary route into the program, a secondary account explanation, and truthful guest and account capability sections. Public program, day, library, exercise, sample workout, and sample analytics surfaces remain available without authentication.

Exercise details show a contextual back link when the origin is valid. Direct visits and invalid origins show **Exercise library**. Video loading, unavailable, approved-pair, and direct YouTube fallback states remain unchanged.

## Domain types and invariants

`PublicExerciseReturnContext` contains a bounded same-origin `href` and a derived label. The parser accepts only:

- `/program` with an optional supported equipment profile.
- One of the five public day paths with an optional supported equipment profile.
- `/library` with supported public library filters.
- `/sample-workout` with a supported day and optional equipment profile.

The parser never accepts an absolute URL, protocol-relative URL, fragment-only target, authentication route, application-account route, control character, repeated scalar value, or arbitrary label. Labels come from the recognized destination rather than untrusted input.

## Persistence contracts

This slice adds no guest persistence. Equipment selection remains temporary. Public exploration and sample activity never appear in member history. Existing authenticated profile, program revision, workout, history, record, analytics, and settings persistence remains unchanged.

## Authentication and authorization

No public landing, program, day, catalog, exercise instruction, approved demonstration, sample workout, or sample analytics read requires authentication. Sign-in is required only for owned data and permanent mutations, including saving an equipment profile, changing prescriptions, adding or substituting exercises, tracking workouts, resuming saved sessions, and viewing member history or analytics.

The contextual return parameter grants no data access. Private paths are rejected at the parsing boundary.

## Failure and recovery states

- If the hero asset fails, alternative text and the complete landing-page navigation remain usable.
- If an origin is missing or invalid, the exercise page returns to the filtered public library.
- If an exercise video is unavailable, the existing second-video and direct-link fallbacks remain usable.
- If the network is interrupted, cached public program, day, library, and explicit artwork assets follow the public-only PWA policy. No guest action reports a saved result.
- Slow navigation retains the existing public loading shell and interruptible Next.js transitions.
- Repeated scalar search or authentication-return parameters fail closed to their public defaults instead of reaching string-only transformations or interrupting the route.

## Responsive behavior

Phone and tablet layouts place the welcome copy before the overhead gym illustration and keep the primary program action in the first viewport. Wide desktop layouts use the illustration as a dominant scene beside the welcome copy without obscuring navigation. The browser selects a 768-pixel responsive derivative on compact viewports instead of preloading the full 1536-pixel source. The capability comparison becomes a readable single column when horizontal space is constrained. Program, day, and exercise routes retain their established responsive atlas layouts.

## Accessibility

- The welcome page has one `h1`, ordered headings, semantic sections, descriptive links, and nondecorative alternative text for the gym scene.
- Keyboard focus follows document order from the skip link through the primary action.
- The contextual back link has a destination-specific accessible name.
- Content remains available with reduced motion, dark mode, forced colors, 200% zoom, and images unavailable.
- Touch targets retain the project minimum, and no meaning depends on color or illustration alone.

## Privacy and security

The generated illustration contains no real person, user data, brand, embedded text, or third-party asset. Its exact generation prompt is preserved as asset provenance. Return destinations are server-validated and same-origin. Guest navigation sends no notes, set values, weights, or identity data to the server.

## Acceptance criteria

- `/` is a distinct welcome page rather than a program alias.
- The page explicitly states that the five-day plan, all days, exercise instructions, both approved demonstrations, and sample resources are available without an account.
- The page explicitly states that sign-in is for saving, customization, tracking, recovery, history, records, and personal analytics.
- `/program` exposes all five days for both equipment profiles without authentication.
- Each public day opens every prescribed exercise and preserves a return path to that day.
- Library-origin exercise navigation returns to the filtered library.
- Sample-workout-origin exercise navigation returns to the same supported day and equipment selection.
- Direct or hostile exercise origins fall back safely to the library.
- The hero uses the original project-owned overhead gym illustration through explicit precached 768- and 1536-pixel sources, reserved intrinsic dimensions, and responsive CSS with no layout shift or unnecessary full-size phone preload.
- The hero is a cohesive, entirely hand-drawn cartoon gym with expressive animal characters and no interactive hotspots, tiles, labels, copied characters, or photorealistic elements.
- Public navigation, PWA shortcuts, and sign-in guest links point to the intended welcome or program route.

## Automated tests

- Add fail-first unit tests for accepted day, program, library, and sample-workout return contexts plus hostile and malformed fallbacks.
- Add component assertions for the landing-page guest/account boundary and contextual exercise back label.
- Update the public Playwright flow to start on the welcome page, enter `/program`, inspect all five days, open Push, open an exercise, and return to Push.
- Cover direct exercise entry, library-origin return, both equipment profiles, keyboard navigation, phone overflow, dark mode, reduced motion, image alternative text, and serious or critical Axe violations.
- Update PWA public asset and navigation expectations for the landing hero and stable `/program` route.
- Prove repeated library `q` and authentication `returnTo` scalars fail closed without a route interruption.

## Browser evidence

Capture one bounded browser pass on phone, tablet, and desktop. The pass must show the welcome first viewport, all five guest days, Push-to-exercise-to-Push return behavior, library-to-exercise-to-library and sample-workout-to-exercise-to-sample-workout return behavior, both equipment profiles, approved video selection, sign-in boundary copy, keyboard-only navigation, 200% reflow, forced colors, reduced motion, and dark mode. Repeat the critical guest flow on the configured Vercel preview before production promotion.
