# Project context

## Product intent

My Workout Pal is a customizable workout companion that connects planning, in-workout guidance, logging, and progress review. It must work for a guest evaluating the companion through an example and for an authenticated user whose personal routine, guidance, logs, and analytics persist.

## Confirmed workflows

- Enter through a distinct public welcome page that explains the workout-companion promise.
- Explore the five-day starter example without an account.
- Preview dumbbell-only and barbell-enabled equipment profiles.
- Inspect reviewed instructions for every published movement and approved demonstrations where available.
- Review progress-preview data with one clear sample-data disclosure.
- Return from an exercise guide to the exact public day, filtered library, or sample workout that opened it.
- Register or sign in with Google or email and password.
- Land in an unmistakably private account after sign-in and see identity, account state, and sign-out controls.
- Verify a password account before permanent mutations.
- Start from the example or a blank routine; add, rename, reorder, or remove days; edit movements, optional sections, and optional cardio; and create private exercises.
- Attach owner-only guidance links without modifying the public catalog.
- Confirm equipment substitutions on the active program.
- Start, complete, interrupt, and resume strength and cardio workouts.
- Review history, personal records, and progress analytics.
- Change units and preferences, sign out, recover access, and delete account data.

## Stack and boundaries

- Next.js App Router PWA with strict TypeScript and Tailwind CSS.
- React Server Components by default. Client Components are limited to interactive and browser-state boundaries.
- Firebase Auth for identity and Firebase Admin for server-side session and revocation checks.
- Neon Postgres through Vercel Marketplace, accessed through Drizzle ORM and versioned migrations.
- Zod validation at every untrusted input boundary.
- Authentication return targets are server-normalized to bounded local paths before client navigation. Missing or invalid destinations use `/app` as the safe member default.
- Public exercise return targets use a separate allowlist for the program, five days, filtered library, sample workout, and canonical Progress preview. The old `/sample-progress` alias normalizes to `/progress`; direct or hostile origins fall back to the library.
- Vitest for domain and integration tests. Playwright covers Chromium and WebKit browser flows.
- Vercel Pro hosts preview and production deployments from GitHub.

## Non-goals

- Medical diagnosis, rehabilitation advice, or outcome guarantees.
- Automatic load prescriptions.
- Guest cloud persistence or claims that guest activity is saved.
- Requiring sign-in to read the starter example, movement instructions, available approved demonstrations, or clearly disclosed progress-preview resources.
- Social feeds, public profiles, coaching marketplaces, or wearable integrations in the initial release.
- Silent production data mutation by a curation or refresh script.
- Paid service changes without explicit approval.

## Source-to-product interpretation

The supplied recording establishes workflow intent, not a design or codebase to reproduce. The product keeps the useful sequence of selecting a day, opening an exercise, logging work, and viewing progress. It replaces the reference name, visual language, routine, information architecture, data model, copy, sample values, and media selection.
