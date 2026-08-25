# Verification plan

## Evidence principles

Local green checks prove only the environment in which they ran. Preview and production require separate build, browser, runtime-log, and commit evidence. Every claim names its environment and commit.

Keep the newest completed run under `docs/qa/latest/`. A concise Markdown note and generated HTML counterpart contain commands, commit, environment URLs, pass and fail counts, TDD fail-then-pass evidence, screenshots, and unresolved findings. Raw traces, videos, HAR files, and redundant screenshots remain untracked unless one is needed to explain a release blocker.

## Static and unit verification

- `pnpm typecheck` with strict TypeScript and no ignored errors.
- `pnpm lint` with Next.js, React, accessibility, import, and project rules.
- `pnpm format:check` for maintained source and documentation.
- `pnpm test:unit` for calculations, conversions, progression, equipment compatibility, substitutions, revision rules, YouTube normalization and ranking, and state reducers.
- `pnpm test:integration` for repositories, migrations, auth session helpers, CSRF, ownership, idempotency, deletion saga, and curation persistence.
- `pnpm db:check` for empty migration, upgrade migration, constraints, rollback policy, and generated-schema drift.
- `pnpm seed:check` for exact starter days, defaults, aliases, compatibility, and exactly two approved videos per required canonical variation.
- `pnpm docs:check` for Markdown and HTML parity.

## Security matrix

Automated tests must cover invalid and missing sessions, unverified password accounts, verified Google identities, expired and revoked sessions, CSRF mismatch, invalid origin, duplicate submit, stale revision, guessed identifiers, cross-user reads and writes, custom exercise ownership, workout ownership, analytics ownership, account deletion, and reauthentication freshness.

Run an adversarial route matrix with two seeded test users. For every owned resource, user B attempts list, read, update, delete, attach, substitute, resume, complete, and analytics access against user A's identifiers. Responses must not disclose existence and database state must remain unchanged.

## Browser matrix

Run Playwright against Chromium and WebKit at the following sizes:

- Phone: 390 by 844.
- Tablet: 820 by 1,180.
- Desktop: 1,440 by 1,000.

Cover guest program and both equipment profiles, all five days, library, exercise detail, dual videos and fallback, sample workout and analytics, registration and sign-in, program editing, custom exercise, complete workout, resume, history, records, analytics, settings, recovery, sign-out, and deletion.

## Unhappy-path matrix

Inject slow and failed server responses, offline transitions, expired auth, duplicate input, stale revision, removed video, denied embed, database error, session exchange error, and service-worker update. Replay refresh, browser back, route navigation, tab-close event, and reopen. Confirm that local draft state, server state, and presented status agree.

## Accessibility and presentation

- Run automated accessibility checks on every primary route and state.
- Complete a keyboard-only pass for navigation, dialogs, comboboxes, editors, runner, charts, auth, and deletion.
- Inspect screen-reader names, live-region behavior, heading order, landmarks, focus restoration, error summaries, and chart table alternatives.
- Test 200% zoom, forced colors where available, light and dark modes, and reduced motion.
- Confirm 44 by 44 CSS pixel interactive targets on phone.

## PWA and performance

- Validate manifest, service worker, installability, update path, offline public routes, cache privacy boundaries, and IndexedDB migrations.
- Run Lighthouse on landing, program overview, day detail, library, and runner shell in mobile and desktop modes.
- Record performance, accessibility, best-practices, and PWA findings without hiding variability.
- Inspect bundle boundaries and ensure interactive dependencies do not move whole routes to the client.

## YouTube evidence

For each seeded canonical exercise and equipment variation, record two unique approved IDs, title, channel, exact variation, eligibility result, reviewer, review time, and full-watch confirmation. Run representative browser tests for two simultaneous choices, one active nonautoplay embed, referrer policy, direct fallback, unavailable primary, and both-unavailable state.

View count can break a tie only after eligibility and quality gates. The QA record must state this ordering and cannot treat popularity as relevance proof.

## Preview verification

For each release candidate:

1. Confirm preview commit and environment variable presence without printing values.
2. Apply migrations only to the preview database or approved isolated branch.
3. Run the production build and browser matrix against the preview URL.
4. Inspect Vercel build logs, function logs, and browser network failures.
5. Verify Firebase session cookies, database ownership, YouTube embeds, service worker, and PWA manifest on the deployed origin.

## Production verification

After verified merge to `main`:

1. Confirm GitHub main, local main, and the Vercel production deployment reference the same commit.
2. Confirm production migrations and seed version without printing credentials or sensitive data.
3. Replay guest flows, a representative authenticated flow, equipment change, runner interruption, persisted history, analytics, and account lifecycle against production-safe test data.
4. Inspect production runtime logs for the tested request IDs and verify no token, note, or raw fitness data leakage.
5. Run Lighthouse and live embed fallback checks on the public origin.
6. Record usage and budget settings separately for Vercel, functions, bandwidth, builds, images, Neon, and YouTube quota.

## Slice closeout questions

Every slice answers the following questions in the latest QA note:

- Which flow did the primary implementer personally observe?
- Which meaningful test failed before the implementation and passed afterward?
- Do types and names describe storage and behavior truthfully?
- Which unhappy and worst-case paths were exercised?
- How does stored canonical data become presented data?
- Can another user access or mutate the resource?
- Do both equipment profiles remain usable?
- For exercise media, are exactly two relevant concise videos approved and watched in full?
- Did view count influence selection only after eligibility and quality gates?
- Can another developer reproduce the evidence from commands and fixtures?
