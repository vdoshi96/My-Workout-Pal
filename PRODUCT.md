# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

The user specified a mobile-first installable Next.js App Router PWA with strict TypeScript, Server Components by default, Tailwind CSS, Firebase Auth, Firebase Admin session verification, Neon Postgres, Drizzle ORM, Playwright, and Vercel Pro deployment.

## Users

The primary user is an adult who wants a structured five-day strength and core routine that works with common home equipment and remains usable during an active workout. This audience statement is inferred from the confirmed equipment and workflow requirements.

Guests evaluate the routine, equipment substitutions, exercise guidance, and sample tracking without creating an account. Authenticated users adapt programs, log real workouts, and review their own progress.

## Product purpose

My Workout Pal turns an equipment-aware program into an interruption-safe workout record. Success means a user can understand the plan, complete a workout with honest save feedback, resume after disruption, and trust that historical results retain their original meaning.

## Positioning

The product combines explicit dumbbell and barbell program variants with confirmed substitutions, immutable workout snapshots, and two approved concise demonstrations for every seeded movement. It does not auto-prescribe weight, rewrite history, or present sample activity as personal progress.

## Operating context

Users browse on phones, tablets, and desktop browsers. Workout logging primarily occurs on a phone with possible disconnection, refresh, tab close, authentication expiry, or device interruption. Guests might install the PWA, but guest interaction remains temporary and is never described as saved.

## Capabilities and constraints

- The starter program has Push, Pull, Legs, Upper, and Lower days. Every day includes core work and configurable walker or runner cardio.
- The guest default supports dumbbells, bodyweight, and an ordinary bench. The barbell profile adds a barbell, plates, a rack, and a bench while retaining dumbbells and bodyweight.
- Equipment changes affect only the active program after a clear preview and confirmation. Compatible prescriptions survive; incompatible movement-specific targets are explained and cleared.
- Authenticated users can create and edit programs and custom exercises, resume workouts, log strength and cardio, review history and analytics, set preferences, and delete their account and data.
- Firebase Auth supports Google and email/password accounts. Password accounts must verify email before permanent mutations. Server code verifies secure HTTP-only sessions and ownership.
- Neon Postgres is the durable store. Firebase UID is the external ownership key. Historical workout meaning is immutable.
- Production requires exactly two manually approved and fully watched YouTube demonstrations for each seeded canonical exercise and equipment variation.
- The product provides training organization and tracking. It does not provide medical advice, diagnose conditions, or guarantee outcomes.
- No paid service, plan upgrade, Marketplace product, or material limit increase can be enabled without explicit user approval.

## Brand commitments

The product name is **My Workout Pal**. The identity, architecture, copy, and assets must be original and must not reuse the reference recording's FITTRACK name or visual system.

## Evidence on hand

The private 96.52-second narrated reference recording demonstrates the desired workflow shape: day navigation, prescribed sections, embedded exercise demonstrations, per-set logging, a rest timer, exercise history, progress views, an exercise directory, and aggregate analytics. The recording is a behavioral reference only and is excluded from publication. No portable source code, customer claims, production data, approved videos, or brand assets were supplied.

## Product principles

- Make save state and data ownership unambiguous.
- Adapt the active plan without altering completed history.
- Keep the runner operable under interruption and constrained attention.
- Explain progression without prescribing unverified loads or making health claims.
- Prefer approved, relevant instruction over content volume or popularity.

## Accessibility and inclusion

The product must support semantic navigation, keyboard use, screen readers, zoom, high contrast, reduced motion, dark mode, and responsive layouts. Controls used during a workout need generous targets, text labels, and noncolor status cues.
