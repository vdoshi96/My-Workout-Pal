# Program Editor Implementation Plan

## User outcome and navigation

An eligible signed-in member can open **Program → Edit program**, change the name and prescription details of the active five-day program, reorder exercises with explicit buttons, and publish one new immutable revision. The editor never changes an in-progress or completed workout snapshot. Cancel returns to the active program without writing data. A successful publish returns to the program overview and names the new revision.

## Interface and state model

The server page loads the active owner-scoped revision and converts it to a serializable draft. The client editor exposes one day at a time on a phone and a day list beside the selected day on wider screens. Every exercise keeps a stable prescription identifier while the draft is open.

The interface represents these states explicitly:

- clean and dirty drafts;
- field-level validation errors plus a summary linked to the first invalid field;
- save in progress, saved, server failure, and retry;
- a stale-revision conflict that preserves the local draft and asks the member to reload before another publish;
- an unverified-email gate that permits inspection but no permanent write;
- offline and interrupted submissions with no claim that data was saved;
- navigation away from an unsaved draft, guarded by an in-app confirmation and the browser `beforeunload` signal;
- empty exercise lists and unavailable referenced exercises as blocking errors rather than silently dropped rows.

## Domain types and invariants

Publication accepts an owner-free envelope containing `programId`, `baseRevisionId`, `name`, five days, prescriptions, cardio prescriptions, and an idempotency key. IDs are UUIDs and malformed, missing, or foreign IDs all use the same not-found response.

The active program must retain exactly the five starter day keys in day-number order. Every day must contain at least one prescription, every prescription belongs to exactly one section in the same day, and each prescription references exactly one active catalog exercise or one active custom exercise owned by the viewer. Exercise logging kind and required equipment come from the canonical record; the client cannot redefine either.

Sets are whole numbers from 1–20. Rest is whole seconds from 0–900. Repetition and duration ranges are positive, ascending, and mutually exclusive. Target weight is finite and non-negative; canonical weight remains kilograms. Cardio duration and pace are integer seconds, distance is a non-negative integer in metres, incline is finite and bounded to a practical range, and walker/runner modes occur once per day.

The published revision number is the locked active revision plus one. Publication inserts a complete graph, leaves the previous published revision unchanged, marks the new revision published, and advances the program pointer in one transaction. A request replay with the same owner, operation, key, and request hash returns the original result. Reusing a key for different content is a conflict.

## Persistence, authentication, and authorization

The route verifies the secure Firebase session and permanent-mutation eligibility before parsing the request body or touching storage. The repository derives ownership only from the verified server viewer. The program root, active revision, every custom exercise, and every referenced catalog record are resolved inside the transaction. Owner UID is not accepted in the request.

Publication writes new `program_revisions`, `program_days`, `program_sections`, `program_prescriptions`, and `program_cardio_prescriptions` rows. It never updates rows that give an older revision its meaning. Existing workout sessions retain their revision and snapshot references. A concurrent equipment change or editor publication produces a conflict rather than a last-write-wins overwrite.

## Loading, empty, error, interrupted, and worst-case behavior

The route uses the private authenticated loading and error boundaries. No active program redirects to onboarding. A corrupt active graph, unsupported exercise, incompatible equipment requirement, foreign custom exercise, duplicate prescription identifier, missing section, stale base revision, or database rollback produces a truthful blocking message and leaves the active pointer unchanged.

If the request disconnects after commit, the client retries with the same idempotency key. If the server is unreachable, the draft remains in memory and the UI says the publish is unsaved. This slice does not claim cross-device draft persistence. A later local-draft feature may add owner-scoped storage without changing publication semantics.

## Phone, tablet, and desktop behavior

Phone layout uses a day switcher, a linear exercise list, explicit Move up/Move down controls, and an expandable exercise editor. Tablet and desktop expose persistent day navigation beside the selected day editor. Cardio settings follow strength prescriptions in logical DOM order. Layout changes do not change keyboard order or hide required validation context.

## Accessibility and motion

The page uses semantic headings, lists, fieldsets, legends, labels, described errors, and a status region. Reorder controls announce the moved exercise and its new position. Focus moves to the error summary after failed validation and to the success heading after publication. Destructive or navigation confirmation uses a labeled modal with focus return. No interaction depends on dragging, hover, color, or animation. Reduced-motion preference disables non-essential transitions.

## Privacy and security

No Firebase UID, email, secret, raw token, or cross-user identifier is serialized into the mutation body. Private responses use `no-store`; server errors do not disclose foreign-resource existence or database details. Text fields are bounded and rendered as text. The same-origin CSRF token and origin policy apply to publication. SQL ownership predicates and foreign keys provide defense in depth.

## Acceptance criteria

- A verified member can rename a program, edit valid prescription targets, reorder exercises, and publish revision `n + 1`.
- Reload shows the new active revision; the prior revision graph is byte-for-byte unchanged.
- Replaying the same request returns the same revision; a changed payload with the same key conflicts.
- A stale editor, foreign program, foreign custom exercise, malformed UUID, incompatible exercise, or unverified password account cannot publish.
- Invalid field data returns precise client validation without a write; server validation independently rejects a forged payload.
- Keyboard-only editing, focus management, phone/tablet/desktop layout, dark mode, and reduced motion remain usable.
- Offline, slow, duplicate, interrupted, and server-error states never claim success.

## Automated tests and browser evidence

Retained failing-first tests cover publication validation, immutable prior revisions, stale bases, idempotent replay, conflicting replay, malformed and foreign identifiers, custom-exercise ownership, equipment compatibility, five-day structure, transaction rollback, and session eligibility. Route tests prove authentication precedes body parsing and database access. Component tests cover field errors, reorder controls, dirty navigation, duplicate submit, and retry copy.

Browser evidence must show a verified member editing and publishing on phone, tablet, and desktop; a keyboard reorder; a stale-conflict recovery; an interrupted request retry; an offline failure; reload of the new revision; and a database-backed check that an earlier workout snapshot still names its original revision. Chromium and WebKit, automated accessibility, dark mode, and reduced motion are required before release.

## Compatible exercise selection increment

### User outcome and navigation

Within any strength, accessory, or core section, a member can add a compatible canonical or owner-only custom movement, replace an existing movement, or remove a movement while keeping at least one movement in the section. Add and Replace open the same searchable chooser without leaving the unpublished draft. The chooser links to private-exercise creation only as a separate navigation that remains subject to dirty-draft confirmation.

### UI states and interaction

The server loads the active program and one compatibility-filtered candidate list before rendering the client editor. The chooser distinguishes canonical and private candidates, exposes name, logging meaning, and required equipment, and searches those bounded text fields locally. It has explicit open, search-results, no-match, selected, cancelled, and unavailable-candidate states. A selected replacement announces whether its targets were preserved or reset. Remove is disabled when it would empty a section; it never silently removes the final prescription.

The chooser is a labeled modal dialog. Opening it moves focus to search, Escape and Cancel close it, backdrop dismissal is supported, and closing returns focus to the invoking Add or Replace control. Results are ordinary buttons in DOM order, not drag targets. Status copy is announced through the editor's existing polite live region.

### Domain types, defaults, and invariants

A serializable candidate contains only its stable exercise ID, catalog-or-custom kind, display name, logging kind, role when canonical, required equipment, and bounded normalized search text. Catalog IDs use the same deterministic public seed identity as the database. Custom candidates come only from the verified viewer's owner-scoped query. Both lists are filtered against the active immutable revision's equipment profile before serialization.

Adding a movement creates a new prescription with no source prescription ID. Strength defaults to 3 sets of 8–12 with 90 seconds rest; accessory defaults to 2 sets of 10–15 with 60 seconds rest; repetition core defaults to 2 sets of 8–15 with 60 seconds rest; timed core defaults to 2 sets of 20–45 seconds with 60 seconds rest. Loads are always null. Distance-plus-duration movements start without a distance target and block publication until the member enters a positive distance; no arbitrary performance target is invented.

Replacing with the same logging kind preserves sets, range, rest, notes, and compatible optional targets. Replacing across logging kinds preserves only sets, rest, set kind, and notes; it applies the new range defaults and clears incompatible weight or distance targets with an explicit announcement. The source prescription ID remains attached so publication can verify that the replacement originated in the active revision, while the server independently clears stale target metadata when exercise identity changes. Removing and reordering never mutate the loaded active graph.

### Persistence, auth, error, and worst-case behavior

Selection itself writes nothing. Publication continues through the strict owner-free envelope and one immutable transaction described above. The server independently resolves every chosen canonical ID or owner custom ID, checks the active equipment profile and logging-shape match, and hides missing, deactivated, foreign, or incompatible custom exercises behind the same safe error boundary. A custom movement deleted in another tab therefore produces a truthful publish failure and leaves the draft intact.

An absent active program redirects to onboarding. A candidate query failure uses the private route error boundary and never renders an incomplete chooser as usable. An empty compatible catalog remains a real empty state with a private-exercise creation path. Offline selection remains local and unsaved; retry uses the same publication idempotency key. Duplicate candidate IDs, malformed stable IDs, an emptied section, or a distance movement without a positive target block publication before a write.

### Responsive behavior, accessibility, privacy, and security

The dialog fills the available phone width below the safe-area inset, uses a bounded scroll region for results, and becomes a centered sheet on tablet and desktop. It preserves the page's semantic order, dark mode, reduced-motion preference, minimum touch targets, visible focus, and zoom-safe text. No result is conveyed by color alone.

The candidate payload contains no Firebase UID, email, aliases not needed for bounded search, token, or approval metadata. Custom candidates remain inside the private server-rendered page and are never placed in public caches. Text is rendered as text, search is length-bounded, and publication still derives ownership exclusively from the verified HTTP-only session.

### Acceptance criteria, tests, and browser evidence

- Pure failing-first tests prove add defaults for strength, accessory, repetition core, and timed core; same-kind replacement preservation; cross-kind reset; final-row removal refusal; non-mutating transforms; candidate search; and the missing-distance publication blocker.
- Repository tests continue to prove foreign, missing, and incompatible candidate denial, exercise-identity metadata clearing, exact five-day publication, idempotency, rollback, and immutable source revisions.
- Component evidence covers dialog focus/return, Escape/Cancel, keyboard selection, empty search, removal guard, reset announcement, dirty navigation, duplicate publish, and retained draft after server failure.
- Phone, tablet, and desktop Chromium plus WebKit evidence must add, replace, remove, cancel, search, publish, reload, and confirm the prior revision stayed unchanged. Automated accessibility, keyboard-only use, dark mode, reduced motion, offline failure, stale custom deletion, and slow/error responses remain release gates.
