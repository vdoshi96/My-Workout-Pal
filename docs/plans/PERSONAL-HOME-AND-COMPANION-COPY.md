# Personal home and companion copy plan

## Outcome

Guests understand My Workout Pal as a customizable companion for planning a routine, training with guidance, logging work, and reviewing progress. The five-day starter remains a public, unsaved example instead of the product promise.

After sign-in, a member lands on `/app` and can immediately identify their account, resume an active workout, open an owned day, edit or manage routines, and review personal history or progress. The home never substitutes public example data for owned data.

This Wave 1 slice owns the public and member home composition, navigation labels, identity and sign-out visibility, sample disclosure, companion-oriented copy, focused tests, and browser evidence. It does not change Firebase provider setup, ownership enforcement, routine-editor controls, movement-library persistence, personal guidance, or the selected Corner Companions production visuals.

## Navigation and terminology

- Public navigation labels `/progress` as **Progress**. `/sample-progress` remains a compatibility redirect to the canonical route.
- Public cached pages remain identity-neutral. **My workouts** enters through `/app`, which preserves the existing bounded sign-in return contract.
- Member navigation labels `/app` as **Home**. Library, History, Progress, and Settings keep their existing destinations.
- Guest copy calls the public routine the **five-day starter example** only where the example is visible.
- Member copy uses **routine** for an owned training plan and names the saved routine and its actual number of days.
- The public progress preview contains one visible disclosure: **Sample data · not your history**. Titles, metric labels, chart labels, and supporting copy do not repeat the sample qualifier.
- Guest workout interactions retain action-level **not saved** warnings when a visitor could otherwise mistake temporary input for persistence.

## Member-home states

### New account

The authenticated shell keeps the display name, verification state, and **Sign out** visible. The setup surface offers **Example routine** and **Blank routine** through one owner-scoped onboarding transaction. Example clones the five-day starter. Blank creates one minimal valid published custom graph—Day 1, Main work, and one compatible replaceable movement—because publication and chooser loading require persisted profile, equipment, program, and movement state. It then opens the existing routine editor without creating a second program or persistence path. The mode is part of the retry-stable idempotency contract. An unverified password member can browse the public example and sees the exact verification recovery requirement, but both permanent setup choices remain disabled.

### Ready account

The home greets the member by the server-derived display name, names the active routine, and shows its actual revision, equipment profile, and day count. It provides the following actions:

- Open an owned day to start or review it.
- Edit the active routine.
- Manage routines.
- Open the compatible movement library.
- Review History and Progress.

The home shows an owned progress summary derived only from completed workouts. If no completed workout exists, it presents a first-workout action and no sample values.

### Active workout

The home reads the owner-scoped resumable session from the server. **Resume DAY_NAME** is the dominant action and targets `/workout/SESSION_ID`. Competing day-start actions are unavailable until that workout is completed or abandoned; routine, library, history, and progress reading remain available.

### Loading and failure

The route-level loading state says that the app is checking the member's routine, resumable workout, and progress. The route-level error state keeps the authenticated shell and identity visible, says that personal data did not load, states that no change was made, and offers a retry.

## Types and persistence

- Add one owner-scoped resumable-workout read that returns either no session or the existing immutable resume model. It accepts only an authenticated server viewer and no client owner identifier; verification continues to gate mutations, not owned reads.
- Reuse the existing active-program read model and progress-insights repository. The home receives a bounded presentation model containing only the fields required for the active action, routine summary, and owned progress summary.
- Do not add a migration, seed, browser-storage record, private cache entry, or mutation endpoint. The canonical public `/progress` preview remains eligible for the existing public navigation cache.
- Do not change start-or-resume, idempotency, immutable snapshot, active-program, or progress-calculation behavior.
- Keep `/app`, `/workout`, owned media, and all private APIs outside the public service-worker cache.

## Authentication, authorization, and privacy

- Derive account identity and every owned read from the revocation-aware HTTP-only server session.
- Keep Firebase client state out of home authorization and never accept a client-supplied UID.
- Preserve the existing bounded same-origin sign-in returns, secure-cookie behavior, CSRF order, email-verification gate, and sign-out cleanup.
- Keep private routine names, session identifiers, history, and progress out of public HTML, the service worker, logs, and retained screenshots unless the authenticated fixture uses synthetic data.
- Keep public pages identity-neutral so cached HTML cannot reveal or guess account state.

## Failure recovery

- A database or progress read failure uses the existing route error boundary and does not report a mutation or a saved result.
- A missing profile is the new-account state, not an error.
- A missing resumable workout is the ready state, not an error.
- An unverified member retains read access and sees permanent actions disabled with a verification explanation.
- An active session always outranks a competing start action. The home cannot invent a replacement session or silently open another day.
- Sign-out retains its current owner-scoped IndexedDB cleanup, secure-session deletion, Firebase sign-out, pending state, and retry message.

## Responsive behavior and accessibility

- Phone layouts keep the primary create, resume, or day action above the fixed member navigation.
- Desktop layouts keep the account rail, identity, verification state, sign-out, personal next action, routine, and progress planes distinct.
- Arbitrary 1-14 day routines wrap into usable rows instead of assuming five equal columns.
- Long display names, routine names, and day names wrap without horizontal overflow at 320 px, 390 px, 430 px, 820 px, 1,280 px, 1,440 px, and 200% zoom.
- Loading uses a polite live status. Read failures use an alert. Disabled competing actions use native disabled semantics or noninteractive text and do not rely on color.
- Headings remain hierarchical, visible labels remain in accessible names, focus styles stay visible, and controls keep the established 44 by 44 CSS pixel target where applicable.
- No production companion illustration, decorative background, animation, or image cache entry is added. The selected Corner Companions packet remains a Wave 3 dependency.

## Test-driven implementation

Retain concise failed-before and passed-after evidence for the following behavior:

- The landing page positions a customizable workout companion and treats the five-day route as an unsaved example.
- Public navigation uses `/progress` and **Progress**; `/sample-progress` redirects to the canonical route.
- The progress preview renders exactly one **Sample data · not your history** disclosure and ordinary metric labels.
- Member navigation labels `/app` as **Home** without broadening its active-route match.
- The personal-home presenter distinguishes new, ready, active-session, unverified, and empty-progress states.
- The owner-scoped resumable read returns only the viewer's active session and treats another owner's or terminal session as absent.
- The active-session home exposes one dominant resume action and no competing start link.
- The ready home exposes every owned day plus edit, manage, library, History, and Progress actions.
- Loading and error copy remains actionable and does not claim that a read failure changed data.
- Public cache policy includes canonical `/progress`, excludes `/app/progress`, and keeps generated `public/sw.js` in parity.

## Browser evidence

Run the public production-mode matrix across Chromium phone, tablet, and desktop plus WebKit phone. Cover the guest landing, canonical Progress route, compatibility redirect, one disclosure, starter not-saved warning, keyboard focus, target sizes, dark mode, reduced motion, accessibility, and zero horizontal overflow.

Run the production-component authenticated fixture in Chromium desktop and WebKit phone. Use synthetic owners and real PGlite repositories to cover:

1. A new verified member with visible identity and sign-out.
2. An unverified member with read-only account state and disabled permanent setup.
3. A returning member with an arbitrary owned routine, actual day count, day actions, edit/manage actions, empty owned progress, History, and Progress.
4. A started workout that changes the home to a dominant resume action and removes competing start actions.
5. A completed workout that removes the resume action and updates the owned progress summary without sample values.
6. Phone and desktop Axe, focus, overflow, and first-viewport action checks.

Retain only the newest completed Wave 1 report and the smallest synthetic screenshots that materially prove distinct desktop and phone states. Remove generated build, Playwright, trace, and report artifacts after their results are reviewed.

## Acceptance criteria

- Guest and global metadata describe a customizable workout companion, not a fixed five-day solution.
- The five-day starter is clearly an unsaved example and remains publicly explorable.
- Public navigation says **Progress**, the canonical route is `/progress`, and the preview has one visible sample-data disclosure.
- A signed-in member always sees their display name, verification state, and **Sign out** in the private shell.
- `/app` provides a personal next action and clear routes to owned days, routine editing, routine management, Library, History, and Progress.
- An active workout produces one dominant resume action and makes competing start actions unavailable.
- Empty, loading, error, verified, unverified, new-member, returning-member, and active-session states are truthful and usable on phone and desktop.
- No ownership, authentication, immutable-history, provider, editor, library, guidance, migration, deployment, or Corner Companions production-art boundary is weakened or expanded.
- Focused tests, complete verification, documentation and service-worker parity, the supported Webpack build, public browser matrix, and authenticated Chromium desktop plus WebKit phone flows pass.
- The completed branch is committed and pushed as `vishal/companion-home-copy` without merging `main`, applying a migration, deploying, aliasing production, or modifying another worktree.
