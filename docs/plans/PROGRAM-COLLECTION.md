# Program collection implementation plan

## User outcome and navigation

A verified member can keep more than one owned five-day program, create a fresh program from either published starter equipment profile, clone any existing owned program, and choose which program is active. The existing `/app` overview, day details, editor, library compatibility, equipment confirmation, and workout start routes continue to operate on exactly one active program. A new `/app/programs` collection is reachable from the active-program header and account navigation. Creating, cloning, or activating a program returns to its active overview; editing remains a separate explicit action.

Guests continue to preview the one public starter route without persistence. Onboarding still creates the first owned starter program. Program collection controls are never shown as saved or available to an unverified password identity.

## Page and flow states

The collection page renders owner-scoped program summaries with name, active state, equipment profile, revision number, five-day count, and last-updated time. It exposes these distinct states:

- loading and private route error boundaries;
- one active starter after onboarding;
- multiple programs with one clearly labeled active program;
- create-from-starter form with name and dumbbell or barbell equipment choice;
- clone review naming the source program and immutable source revision;
- activating, creating, cloning, saved, failed, interrupted, and retry states;
- unverified read-only state with every permanent control disabled;
- stale current-active or source revision conflict that preserves entered form values;
- foreign, deleted, or malformed program identity using one not-found outcome;
- corrupt collection with zero or multiple active rows as a blocking recovery state rather than an arbitrary selection.

No operation silently changes an in-progress workout. Switching active programs affects only future overview, editor, equipment, and workout-start navigation. Existing sessions and historical snapshots retain their original program and revision IDs.

## Domain types and invariants

`ProgramSummary` contains the opaque program ID, bounded display name, active published revision ID and number, equipment profile, five-day count, active flag, and updated timestamp. It contains no owner UID.

Creation accepts a strict owner-free envelope with `mode: "starter"`, a trimmed 1–180 character name, `equipmentProfileKind`, and a required 1–180 character idempotency key. Cloning accepts `mode: "clone"`, the source program ID, source revision ID, name, and idempotency key. Activation accepts the target program ID, expected current program ID, target revision ID, and idempotency key.

Every owner may have at most 24 program roots and exactly one active root after onboarding. The database enforces at most one active row per owner with a partial unique index; repository transactions enforce the non-empty active invariant. Every program key is server-generated and unique within the owner. A new starter program receives revision 1 cloned from the selected published template. A cloned program receives revision 1 with a complete copy of the source program's current published graph, including compatible owner custom-exercise references, display names, targets, notes, ordering, and cardio. It does not share mutable descendant rows with the source.

Create and clone activate the new root atomically. Activation never creates a revision. The persisted account equipment profile follows the active revision's equipment profile so library filtering and active settings remain coherent. Equipment confirmation remains revision-producing and is rejected unless the supplied program is the current active root. The operation changes only that root plus the account's current equipment selection; other program revisions and all workout snapshots remain byte-stable.

## Persistence and migrations

Add a non-null `is_active` boolean to `user_programs`, initially false. Backfill the existing owner starter row as active, then add a unique partial index on owner where `is_active` is true. The checked-in versioned migration must upgrade the real prior migration sequence and must not be applied to Neon until the release migration checkpoint is explicitly authorized and verified.

Repository reads list every owner root in deterministic active-first, recently-updated order and resolve the active root by the new flag rather than the starter program key. Onboarding creates its starter root as active. Create, clone, and activate lock the owner's program roots, validate the expected current/source revision, reserve and lock the owner-scoped idempotency row, update active flags and equipment inside one transaction, and return the complete refreshed read model. A killed or disconnected request can replay the same key and obtain the original result. Reusing a key with different input conflicts.

Program graph cloning inserts a new root, revision, days, sections, prescriptions, and cardio rows with new opaque identifiers. Catalog and custom exercise identities are referenced, not duplicated. Custom exercises are re-resolved with the viewer owner predicate inside the transaction. Historical revisions are never updated or deleted.

## Authentication, authorization, privacy, and security

All reads derive the Firebase UID from the revocation-aware HTTP-only session. Mutations validate same-origin double-submit CSRF, require a verified permanent-mutation viewer before parsing the bounded body or opening the database, and never accept an owner UID, email, token, account status, active flag, revision number, or persistence outcome from the client.

Every source, target, revision, custom exercise, and update predicate includes the server viewer's owner UID. Foreign and missing IDs share the same private 404 response. Responses use `Cache-Control: private, no-store`; logs and browser payloads contain no secret, credential, Firebase UID, workout measurement, or another member's program count. Text is bounded and rendered as text. A database or invariant failure returns a safe error and rolls back the entire active-pointer change.

## Loading, empty, error, interrupted, and worst-case recovery

An owner with profile data but no active row receives a blocking recovery message and no editor or start-workout controls. The repository never guesses by update time. Multiple active rows are prevented by the partial unique index and treated as corruption if encountered before migration repair. A source deleted between render and clone returns not found; a source revision changed between render and submit returns conflict; a custom exercise deleted or transferred is impossible to clone and rolls back. Reaching 24 programs produces a validation response without a partial root.

Client mutation state retains one idempotency key while a request is pending, failed, offline, or ambiguously interrupted. Duplicate clicks are disabled. Only a structurally validated success updates the page or navigates. An auth expiry returns through the bounded sign-in route with the collection destination preserved. Browser back, refresh, tab close, or network loss never turns an unconfirmed operation into a success message.

## Phone, tablet, desktop, accessibility, and motion

On phones, program summaries are a single semantic list and create or clone review opens as a full-width, internally scrollable sheet above safe-area navigation. Tablet and desktop use a bounded two-column collection and action panel. Logical DOM and keyboard order remain list, active controls, create form, and status regardless of layout.

Every form field has a visible label and described error. Active status uses text and `aria-current`, not color alone. Review sheets use a labeled dialog, focus the heading or first invalid field, trap focus, close with Escape and Cancel, and restore focus to the invoker. Status changes use a polite live region until a failure becomes an alert. Buttons meet 44 by 44 CSS pixel targets, zoom to 200 percent without horizontal page overflow, retain visible focus, support dark and forced-colors modes, and avoid non-essential motion when reduced motion is requested. No action depends on drag, hover, or animation.

## Acceptance criteria

- Onboarding creates exactly one active starter program and existing upgraded owners retain their starter as active.
- A verified owner can create dumbbell and barbell starter programs with bounded custom names; the new program becomes active and contains the exact published five-day graph.
- A verified owner can clone any owned current revision; source and clone graphs have equal meaning but distinct root, revision, day, section, prescription, and cardio IDs.
- A verified owner can activate another owned program without creating a revision or changing either graph.
- The active overview, editor, day routes, compatible library, equipment confirmation, and workout start all resolve the selected active program.
- Equipment confirmation refuses a non-active program and changes only the active root's new revision. Other programs and workout history remain unchanged.
- Same-key replay returns the original create, clone, or activation result; changed input, stale expected active/source revision, duplicate submit, or concurrent activation cannot create two active rows.
- Unverified, unauthenticated, malformed, foreign, over-limit, and incompatible-custom-exercise paths make no write and reveal no cross-user information.
- Empty, offline, slow, interrupted, expired-auth, database-error, and corrupt-active states remain truthful and recoverable.

## Test-driven implementation and browser evidence

Retain a failing-first migration/schema suite for the missing active marker and partial unique index. PGlite repository tests use the full migration sequence and cover upgraded starter activation, exact starter creation in both profiles, full custom-edited clone fidelity, distinct descendant IDs, owner isolation, source revision staleness, program limit, same-key replay, changed-key conflict, concurrent activation, equipment synchronization, non-active equipment refusal, transaction rollback, and immutable other-program/workout history.

Direct route tests first fail for missing handlers, then prove strict schemas, 32 KiB body limits, CSRF before viewer resolution, viewer before body/database, owner-free payloads, safe errors, no-store responses, and structural success validation. Component tests cover dialog focus and return, field errors, duplicate disabling, retained retry keys, clone disclosure, active labeling, interrupted failure, and no false navigation.

Configured browser evidence must create both starter profiles, clone an edited program, switch among three programs, publish one edit, change only the active program's equipment, start a workout, and return to the correct program on phone, tablet, and desktop in Chromium and WebKit. It must also exercise keyboard-only operation, 200 percent zoom, dark mode, reduced motion, automated accessibility, slow response, offline failure, duplicate click, stale conflict, reload, expired auth, and another-owner program denial. Database inspection must prove prior program revisions and workout snapshots are unchanged. Local browser evidence remains distinct from preview and production proof.
