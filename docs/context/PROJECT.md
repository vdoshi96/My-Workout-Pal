# Project context

## Product intent

My Workout Pal is a trustworthy bridge between a prescribed routine and the record that a user creates while training. It must work for a guest evaluating the routine and for an authenticated user whose program, logs, and analytics persist.

## Confirmed workflows

- Browse the starter catalog and all five days without an account.
- Preview dumbbell-only and barbell-enabled equipment profiles.
- Inspect two approved demonstrations for each seeded movement.
- Review clearly labeled sample workout and analytics data.
- Register or sign in with Google or email and password.
- Verify a password account before permanent mutations.
- Clone or create a program, edit prescriptions, and create custom exercises.
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
- Authentication return targets are server-normalized to bounded local paths before client navigation.
- Vitest for domain and integration tests. Playwright covers Chromium and WebKit browser flows.
- Vercel Pro hosts preview and production deployments from GitHub.

## Non-goals

- Medical diagnosis, rehabilitation advice, or outcome guarantees.
- Automatic load prescriptions.
- Guest cloud persistence or claims that guest activity is saved.
- Social feeds, public profiles, coaching marketplaces, or wearable integrations in the initial release.
- Silent production data mutation by a curation or refresh script.
- Paid service changes without explicit approval.

## Source-to-product interpretation

The supplied recording establishes workflow intent, not a design or codebase to reproduce. The product keeps the useful sequence of selecting a day, opening an exercise, logging work, and viewing progress. It replaces the reference name, visual language, routine, information architecture, data model, copy, sample values, and media selection.
