# Decisions

## 2026-08-25: Treat the recording as workflow evidence

The private recording is evidence for navigation and interaction intent. It is not a source repository or visual specification. The application uses original code, data, copy, assets, and identity.

## 2026-08-25: Keep guest data temporary

Guest equipment and runner interactions remain in memory or tab-scoped browser storage. The interface labels sample data and never reports that guest activity is saved to an account.

## 2026-08-25: Use immutable program and workout revisions

Editing a program creates a revision. Starting a workout snapshots the relevant prescription and exercise meaning. Later program or catalog edits do not alter completed or in-progress history.

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
