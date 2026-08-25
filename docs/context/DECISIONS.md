# Decisions

## 2026-08-25: Treat the recording as workflow evidence

The private recording is evidence for navigation and interaction intent. It is not a source repository or visual specification. The application uses original code, data, copy, assets, and identity.

## 2026-08-25: Keep guest data temporary

Guest equipment and runner interactions remain in memory or tab-scoped browser storage. The interface labels sample data and never reports that guest activity is saved to an account.

## 2026-08-25: Use immutable program and workout revisions

Editing a program creates a revision. Starting a workout snapshots the relevant prescription and exercise meaning. Later program or catalog edits do not alter completed or in-progress history.

## 2026-08-25: Keep the deletion job outside profile ownership

The account-deletion saga record is keyed by the server-derived Firebase UID but has no foreign key to `user_profiles`. It must survive the owned-data transaction so Firebase deletion can be retried after fitness data and the profile are gone. The job stores only bounded phase, status, attempt, idempotency hash, and safe error-code metadata. Migration `0001_account_deletion_saga` refuses to run if legacy job rows exist, requiring explicit review instead of inventing resumable state. This migration is checked in and tested locally but has not been applied to Neon.

## 2026-08-25: Store canonical metric values

Weight is stored in kilograms, distance in meters, and duration in seconds. Validated boundaries convert user input and presentation according to preferences.

## 2026-08-25: Verify identity only on the server

Firebase client identity is exchanged for a secure HTTP-only session. Server code derives Firebase UID from the verified session and applies it to every user-owned database query. Client-supplied ownership identifiers are ignored or rejected.

## 2026-08-25: Require confirmed video approval

Discovery scripts can propose candidates but cannot silently seed production. A seeded demonstration requires mechanical eligibility, manual review, a complete viewing, approval metadata, and complete two-video mapping validation.

## 2026-08-25: Defer an open-source license decision

The repository can be public without granting an open-source license. No license will be added without explicit legal approval from the user.

## 2026-08-25: Use a training route atlas visual system

The program is represented as a route with five waypoints, and equipment changes reroute only substituted movements. The selected mobile comp is `.impeccable/mocks/route-atlas-map.png`. Semantic structure and status truth outrank decorative cartography.

## 2026-08-25: Use the supported webpack production build path

The first Next.js 16.3.2 Turbopack production compile held the build lock without advancing diagnostics and required termination after more than one minute. The same source compiled, type-checked, prerendered, and traced in about 10 seconds with `next build --webpack`. The package build script uses webpack until a bounded Turbopack investigation proves the default reliable.

## 2026-08-25: Cache public reading routes only

The service worker may cache the guest program, library, samples, offline page, and static assets. It does not intercept authenticated navigation or API requests. Account writes require a confirmed server response and must expose pending, failed, and retry states instead of treating an offline queue as saved data.

## 2026-08-25: Prefer a nonce CSP for fitness and account data

Application HTML is request-rendered so Next.js can attach a fresh nonce to framework scripts and generated styles. This disables static HTML and ordinary CDN caching for application pages and increases function work, but avoids production `unsafe-inline` while the product handles account and fitness data. The web manifest and ordinary static assets remain static, and the service worker retains its public-only offline cache. Usage monitoring must account for this deliberate server-rendering cost.

The response policy allows only the Firebase network and frame boundaries needed for authentication and the YouTube origins needed for approved embeds. `strict-origin-when-cross-origin` preserves the referrer YouTube requires. `same-origin-allow-popups` preserves Google sign-in popup behavior without weakening frame ancestry.
