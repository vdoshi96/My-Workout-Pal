# Production-grade audit and correction

## Outcome

The September 22, 2026 request asks for a whole-application audit that flags and fixes obvious slop, broken workflows, and design, UX, and UI defects so the product reads and behaves as production software. Reuse and rewrite are both allowed. Durable working rules belong in `AGENTS.md`; the repository does not use a root `CLAUDE.md`.

The audit combined four read-only code reviews (runner, routine management, public/auth/settings/progress, and styling) with rendered Chromium inspection of every public route against the local development server and every member route against the synthetic authenticated fixture, at 390 × 844 and 1440 × 1000.

## Findings that drive the work

### Broken or dead-end workflows

- Settings redirects to Today until a routine exists, so a new member cannot change units, sign out from Settings, or delete their account.
- An email/password member cannot request another verification email, so a lost message blocks setup permanently.
- The "Reduce interface motion" preference is saved but never applied.
- "Custom starting point" on the routines page lists only movements already in the active routine instead of the compatible catalog.
- The routine editor instructs members to discard edits but has no Discard action.
- Validation errors expose internal schema paths such as `days → 0 → sections → 1 → …`.
- Runner: Abandon, Skip exercise, and Complete are single-tap irreversible actions; conflicted saves offer no way to clear them and so block both Exit and Complete; recovery failure has no way forward; Next set and Next exercise delete the running rest timer; validation shows `weightKg is required`.
- Member guide links leave the member layout for the public site, and the public back link cannot return to `/app` routes.
- `/app` has no not-found page; the root not-found page links "Open program" to `/`.
- The installed-app manifest starts on the marketing page and its shortcuts open public sample data.
- Account deletion lands on the homepage without confirmation that it happened.

### Design and UI defects

- `/program` and `/program/[day]` still use the retired all-caps atlas presentation with their own headers; on phones the route map overlaps the subtitle and pushes a day badge off-screen.
- Public Library, Library detail, and Progress headings touch the viewport edge; the Library detail page shows demonstration tabs as tall empty boxes and places the video below reference notes on phones.
- Onboarding leaves the skip link visible after each step because focus falls to the document start; headings mix three unrelated uppercase treatments.
- The public phone navigation wraps "My workouts" onto two lines; guests see "My workouts" rather than "Sign in".
- Warm-up and work set tabs are indistinguishable on phones.
- Internal design notes ship in every HTML response through a hidden `<template>`.
- Member pages have no document titles.

### Copy

Large parts of the interface narrate implementation rather than helping a person train: "immutable session snapshot", "idempotent session", "canonical", "topology keys", "seeded movements", "Firebase session", "reconciled", "Credential gate", and policy disclaimers repeated on ordinary screens. Replacement copy is short, direct, and second-person. Truthfulness constraints from `PRODUCT.md` remain: guest activity is never described as saved, the app never prescribes load, and demonstrations remain policy-gated.

## Scope of correction

The exact build contract, acceptance tests, and win conditions are in `docs/plans/PRODUCTION-GRADE-IMPLEMENTATION.md`; it supersedes the summary below wherever they differ.

1. **Runner:** confirmations for Abandon and Skip; a discard action for conflicted or permanently failed operations; a recoverable path from failed recovery; rest timer survives set/exercise advancement (domain test first); inline, human validation; one forward action with a clear final "Finish workout"; focus moves to the new movement heading; secondary controls collapse behind one disclosure; copy rewrite.
2. **Routine management:** full compatible catalog for custom starting points; Discard changes with confirmation; readable, field-linked validation; consistent "routine" vocabulary; clear effects when a new routine becomes active; equipment disclosure opens on direct link; onboarding focus and a time-zone selector; copy rewrite.
3. **Public, account, and shell:** `/program` and `/program/[day]` rebuilt on the shared public shell and Quiet Set system; public page padding and Library detail layout; guest navigation labels; Settings available before setup; verification resend; motion preference applied; member-context guide return; not-found, error, loading, and offline copy; manifest corrections; member document titles; removal of the shipped design-note template; deletion confirmation; copy rewrite.
4. **Styling:** delete verified-dead selectors, fold override patches into their base rules where safe, and correct token misuse found by the styling review.

Out of scope: schema changes, new persistence, catalog or video approval changes, companion artwork, and production data. Routine deletion and rename need a new API and migration; they are recorded as follow-up work rather than added here.

## Navigation, states, types, and persistence

No route is removed. `/sample-progress` keeps redirecting to `/progress`. Member navigation remains Today, Routine, Library, and Progress with Settings as a utility; `/app/programs` selects Routine. Storage units, immutable revisions and workout snapshots, owner checks, and CSRF-protected mutations are unchanged. New client-only state (discard confirmation, dialogs, disclosure) is not persisted. Discarding a failed runner operation removes only that local operation and restores the server-confirmed value.

## Authorization, privacy, and failure recovery

Every mutation still derives the Firebase UID on the server. Settings before setup exposes only account-level controls; equipment controls remain unavailable until a routine exists. Verification resend uses the Firebase client for the currently signed-in user only. Recovery paths never report unconfirmed work as saved. No private recording, derived media, or real account data enters evidence.

## Responsive behavior and accessibility

Phone (390 px), tablet, and desktop layouts must have no horizontal overflow and no text overlap. Interactive targets used during a workout stay at least 44 px. Step and set transitions move focus to the new heading. Errors are associated with their inputs through `aria-invalid` and `aria-describedby`. Status regions stay single and concise. Reduced motion honors both the operating-system and the saved preference.

## Acceptance criteria and tests

- Domain changes (rest timer persistence, operation discard) have a test that fails before and passes after the change.
- Existing unit, integration, authenticated, and public end-to-end tests are updated wherever copy or controls intentionally change, never weakened to hide a regression.
- `pnpm verify` passes: types, lint, all tests, database/seed/PWA checks, documentation parity, production build, and the production route boundary.
- Browser evidence covers the public welcome, example routine and day, Library and detail, Progress preview, sign-in, and the member Today, onboarding, routine editor, routines, workout runner, Progress, History, and Settings on phone and desktop.

Implemented on branch vishal/production-grade-audit; see docs/qa/latest/PRODUCTION-GRADE-QA.md.
