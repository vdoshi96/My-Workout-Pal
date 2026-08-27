# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

The user specified a mobile-first installable Next.js App Router PWA with strict TypeScript, Server Components by default, Tailwind CSS, Firebase Auth, Firebase Admin session verification, Neon Postgres, Drizzle ORM, Playwright, and Vercel Pro deployment.

## Users

The primary user is an adult who wants one place to plan a personal routine, use it during training, review form guidance, log work, and understand progress. Their routine can contain as many or as few named training days and movements as the bounded editor supports; it is not defined by the five-day starter.

Guests evaluate the companion through the movement library, one editable five-day example, and a clearly disclosed progress preview. Authenticated users create or adapt routines, log real workouts, attach private guidance when needed, and review their own progress.

## Product purpose

My Workout Pal helps a person plan ahead, get through a workout with useful guidance and honest save feedback, resume after disruption, and review progress without changing the meaning of their history.

## Positioning

The product combines personal routine building, an expandable movement library, equipment-aware substitutions, private guidance links, immutable workout snapshots, and approved demonstrations where available. The five-day route is an example template, not the product's prescription. The app does not auto-prescribe weight, rewrite history, or present sample activity as personal progress.

## Operating context

Users browse on phones, tablets, and desktop browsers. Workout logging primarily occurs on a phone with possible disconnection, refresh, tab close, authentication expiry, or device interruption. Guests might install the PWA, but guest interaction remains temporary and is never described as saved.

## Capabilities and constraints

- The starter example has Push, Pull, Legs, Upper, and Lower days. Its core work and walker or runner cardio demonstrate available features but are not mandatory in a personal routine.
- Authenticated routines use bounded flexible day, section, movement, and optional-cardio structures with arbitrary display names and immutable published revisions.
- The guest default supports dumbbells, bodyweight, and an ordinary bench. The barbell profile adds a barbell, plates, a rack, and a bench while retaining dumbbells and bodyweight.
- Equipment changes affect only the active program after a clear preview and confirmation. Compatible prescriptions survive; incompatible movement-specific targets are explained and cleared.
- Authenticated users can create and edit programs and custom exercises, resume workouts, log strength and cardio, review history and analytics, set preferences, and delete their account and data.
- Firebase Auth supports Google and email/password accounts. Password accounts must verify email before permanent mutations. Server code verifies secure HTTP-only sessions and ownership.
- Neon Postgres is the durable store. Firebase UID is the external ownership key. Historical workout meaning is immutable.
- A canonical movement can be useful with reviewed names, metadata, and instructions before video approval. When the app publishes a catalog demonstration pair, it requires exactly two manually approved and fully watched YouTube demonstrations for that movement variation.
- Members can attach owner-only guidance links without changing the public catalog or labeling those links as approved.
- The product provides training organization and tracking. It does not provide medical advice, diagnose conditions, or guarantee outcomes.
- No paid service, plan upgrade, Marketplace product, or material limit increase can be enabled without explicit user approval.

## Brand commitments

The product name is **My Workout Pal**. The identity, architecture, copy, and assets must be original and must not reuse the reference recording's FITTRACK name or visual system.

## Evidence on hand

The private 96.52-second narrated reference recording demonstrates the desired workflow shape: day navigation, prescribed sections, embedded exercise demonstrations, per-set logging, a rest timer, exercise history, progress views, an exercise directory, and aggregate analytics. The recording is a behavioral reference only and is excluded from publication. No portable source code, customer claims, production data, approved videos, or brand assets were supplied.

## Product principles

- Make save state and data ownership unambiguous.
- Make account state unmistakable after sign-in.
- Treat the five-day starter as an editable example, never as the product boundary.
- Adapt the active plan without altering completed history.
- Keep the runner operable under interruption and constrained attention.
- Explain progression without prescribing unverified loads or making health claims.
- Prefer approved, relevant instruction over content volume or popularity.

## Accessibility and inclusion

The product must support semantic navigation, keyboard use, screen readers, zoom, high contrast, reduced motion, dark mode, and responsive layouts. Controls used during a workout need generous targets, text labels, and noncolor status cues.
