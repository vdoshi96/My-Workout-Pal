# Surface implementation plans

## Shared shell and navigation

**Outcome and navigation:** A visitor always understands whether they are in guest preview, sample data, an authenticated account, or an active workout. Public and authenticated destinations retain stable URLs. An active runner replaces ordinary navigation with workout progress and an explicit exit path.

**States and types:** The shell handles public, loading-session, authenticated-verified, authenticated-unverified, expired, offline, and deletion-pending identity states. `ViewerContext` is server-derived and never accepts a client UID.

**Persistence and authorization:** Public navigation is static. Authenticated labels come from the verified session and owned profile. Private route segments redirect through a return URL that is validated as same-origin.

**Device and accessibility behavior:** Phone uses a labeled bottom navigation bar outside the runner. Tablet and desktop use a rail or header with the same DOM order. The shell includes a skip link, visible focus, current-page semantics, safe-area padding, and reduced-motion transitions.

**Acceptance, tests, and evidence:** Unit tests cover return-URL validation and navigation selection. Playwright covers guest, verified, unverified, expired, keyboard-only, reduced-motion, phone, tablet, and desktop navigation. Required evidence shows the shell and one protected-route transition at each viewport.

## Landing and program overview

**Outcome and navigation:** A guest sees what the product does, the five-day structure, the selected equipment profile, and clear routes to inspect a day, sample workout, sample analytics, or sign in. An authenticated user sees their active program and resume action instead of fabricated marketing proof.

**UI states:** Render seeded overview, alternate-equipment preview, signed-in program, active-session resume, loading, catalog unavailable, and offline-cached states. Sample content is marked **Sample** at its heading and at any metric group. Guest actions say **Try this session** or **Preview**, never **Save**.

**Domain and persistence:** The public starter template is immutable seed data. Guest equipment choice is tab-scoped. An authenticated overview reads the active program revision and latest session through owner-scoped repositories.

**Security and worst cases:** A missing user program offers a clone action only to an eligible account. Cross-user or stale IDs resolve as not found. A failed clone keeps the public overview and shows a retryable result.

**Device and accessibility behavior:** Phone leads with the next useful action and a horizontal day index with alternative non-scroll navigation. Desktop combines the weekly route and selected-day preview. All program diagrams have a list equivalent.

**Acceptance, tests, and evidence:** Tests verify five exact days, guest labeling, equipment parity, owned active-program selection, and clone idempotency. Browser evidence covers both guest profiles, an authenticated overview, sample labeling, offline public load, and slow/error behavior.

## Equipment selector and onboarding

**Outcome and navigation:** A guest or user can understand the two profiles and see exactly which movements change before confirming. The control appears in guest preview, onboarding, program settings, and the program editor.

**UI states:** Show current profile, proposed profile, substitution count, detailed before/after list, retained targets, cleared incompatible targets with reasons, no-change state, saving, success, stale revision, failure, and cancelled confirmation.

**Domain and persistence:** `EquipmentProfileKind`, compatibility derivation, and the substitution matrix drive the UI. Guest changes affect only the preview. Authenticated confirmation creates a new active-program revision and equipment profile transactionally.

**Authorization and privacy:** The server derives ownership and checks the base revision. An unverified password account can preview but cannot persist. No history row or workout snapshot is updated.

**Device and accessibility behavior:** Phone uses a full-height confirmation sheet with focus trapping and a scrollable substitution list. Tablet and desktop use a dialog or side inspector. Changes are expressed in text, not color alone.

**Acceptance, tests, and evidence:** TDD covers forward and reverse substitutions, compatibility, retained notes and ranges, cleared load targets, immutable history, stale confirmation, duplicate submit, and ownership. Browser evidence replays both profiles in all four entry points and confirms cancellation and error recovery.

## Day detail

**Outcome and navigation:** A user can scan the selected day's goal, sections, prescriptions, cardio option, equipment fit, and estimated structure, then open an exercise or start the day.

**UI states:** Show public template, owned revision, current or substituted movement labels, active-session resume, no cardio choice, loading, empty custom day, incompatible custom exercise, and unavailable catalog record.

**Domain and persistence:** Day sections have stable order and prescription snapshots. Cardio template selection is temporary for guests and stored in the program revision for users.

**Authorization and worst cases:** Starting a session requires verified eligibility and a current active revision. A stale day link redirects to the matching active revision or explains that it belongs to history. Duplicate starts resume the existing active session.

**Device and accessibility behavior:** Phone uses a linear section list with sticky start or resume action. Larger screens pair the list with selected-exercise context. Section counts and equipment labels have text equivalents.

**Acceptance, tests, and evidence:** Seed tests assert exact exercise order and defaults for every day and both profiles. Browser evidence covers all five days, both profiles, cardio choice, deep links, duplicate start, and a stale revision.

## Exercise detail and video player

**Outcome and navigation:** A visitor understands the movement, equipment, logging kind, prescription context, and can select either approved demonstration without autoplay. The runner can return without losing draft state.

**UI states:** Show two approved choices, one active embed, embed loading, unavailable primary, alternate available, both unavailable, offline metadata, direct YouTube fallback, custom exercise with zero to two links, and removed-video review flag.

**Domain and persistence:** Seeded records require exactly two ordered, unique, approved videos for the exact variation. Durable fields include video ID, title, channel, order, variation, approval reviewer, and review timestamp. View count is not a production ranking field.

**Security and privacy:** Only normalized video IDs enter embed URLs. The iframe uses compliant YouTube parameters, title, allow list, referrer policy, responsive minimum size, and no autoplay. Custom videos remain owner-scoped.

**Device and accessibility behavior:** One player appears at a time. Selectors are real radio or tab semantics with title and channel. The direct-link fallback names the destination. Phone keeps the video within viewport width; desktop avoids an oversized player.

**Acceptance, tests, and evidence:** Tests cover URL normalization, exact-two seed validation, duplicates, wrong variation, missing approval, responsive parameters, and fallback selection. Browser evidence uses two representative live embeds, selection, keyboard control, failed embed fallback, narrow and desktop sizes, and referrer inspection.

## Searchable exercise library

**Outcome and navigation:** Guests and users can search by movement, muscle, equipment, or alias, filter by compatibility, open details, and select a replacement in editor or runner context.

**UI states:** Show complete catalog, debounced search, active filters, no matches, incompatible-only results, offline cached catalog, loading, server error, and owned custom results for authenticated users.

**Domain and persistence:** Search uses normalized aliases and server-side filtering for large results. Compatibility derives from required equipment. Custom exercises join only for their owner and cannot shadow canonical slugs.

**Security and privacy:** Search results never include another user's custom exercise. Query length and characters are bounded. Replacement context accepts only an exercise compatible with the intended logging and equipment constraints.

**Device and accessibility behavior:** Search and filters use a labeled combobox and disclosure controls. Results remain a semantic list. Phone uses a filter sheet; desktop exposes persistent filters.

**Acceptance, tests, and evidence:** Tests cover aliases, case and punctuation normalization, compatibility, user isolation, filter combinations, and selection validation. Browser evidence covers keyboard search, no results, both equipment profiles, a custom exercise, offline catalog, and mobile filter recovery.

## Program editor

**Outcome and navigation:** An eligible user can clone, create, rename, reorder, and edit days, sections, prescriptions, targets, rest, cardio, and equipment while retaining a clear unpublished draft and immutable published revisions.

**UI states:** Show clean draft, dirty draft, field errors, optimistic reorder with rollback, substitution preview, conflicting active revision, saving, published success, failed publish, offline unsupported publish, and navigation confirmation.

**Domain and persistence:** The editor uses a `ProgramDraft` with stable client keys and a required base revision. Publishing validates prescription ranges, ownership, equipment, custom exercises, and day structure, then creates one immutable revision and advances the active pointer.

**Authorization and privacy:** Unverified password accounts can edit a local draft but cannot publish. All referenced custom exercise IDs are checked against the owner. A guessed program or revision ID returns not found.

**Device and accessibility behavior:** Phone edits one hierarchy level at a time with breadcrumbs and explicit reorder controls. Tablet and desktop show tree and inspector panes. Drag-and-drop always has keyboard move alternatives and announcements.

**Acceptance, tests, and evidence:** TDD covers revisions, stale bases, reorder, duplicate publish, validation, ownership, substitutions, and snapshot preservation. Browser evidence covers clone, custom create, edit, reorder by keyboard, equipment change, publish, conflict, offline interruption, and reload.

## Custom exercise editor

**Outcome and navigation:** A user can create or edit a private movement with clear logging semantics, equipment, instructions, and up to two validated YouTube URLs.

**UI states:** Show create, edit, unsaved, validation error, duplicate name warning, zero, one, or two valid videos, unsupported URL, removed video, saving, success, conflict, and deletion impact preview.

**Domain and persistence:** A custom exercise has owner, name, logging kind, equipment, instructions, aliases, and normalized video IDs. Changing logging kind when history exists creates a new semantic revision or requires a clone; it does not reinterpret prior logs.

**Authorization and privacy:** Owner checks apply to every read, update, use, and delete. URLs are parsed, not fetched by the server during ordinary save. Instructions are rendered as text.

**Device and accessibility behavior:** Inputs use persistent labels, described errors, and clear units. Phone uses a linear form; desktop groups identity, logging, and media without changing tab order.

**Acceptance, tests, and evidence:** Tests cover URL variants, duplicates, maximum count, equipment and logging validation, semantic revisions, deletion references, and cross-user access. Browser evidence covers all link counts, invalid URLs, edit conflict, keyboard completion, and destructive confirmation.

## Active workout runner

**Outcome and navigation:** A user can see previous values and current targets, distinguish warm-up and work, log every supported set type, take notes, run rest timing, skip or substitute, and finish with an honest persisted result.

**UI states:** Show loading snapshot, ready, pending local operation, saved, failed with retry, offline queued, auth expired, conflict, duplicate submit, timer running or paused, skipped, substituted, completing, completed, and blocked completion. Refresh and reopen resume the same state.

**Domain and persistence:** The runner reads an immutable workout snapshot. `SetDraft` and `CardioDraft` validate by logging kind. Each operation receives an idempotency key and persists to IndexedDB before network submission. Server results reconcile by operation key and source revision.

**Authorization and privacy:** Every session and snapshot read is owner-scoped. Cross-user IDs return not found. Auth expiry retains local draft under the original UID but blocks sync until the same identity reauthenticates. Sign-out clears visible private state.

**Device and accessibility behavior:** Phone keeps the current exercise, set controls, save status, and next action within reach. Tablet and desktop can show workout outline and active entry together. Numeric input does not prevent hardware keyboard entry. Timers have text state and controlled live announcements.

**Acceptance, tests, and evidence:** TDD covers all logging kinds, warm-up exclusion, progression suggestion, idempotency, duplicate submit, interruption, ordering, substitution, conflict, completion, and ownership. Playwright personally replays a full representative workout in Chromium and WebKit, including refresh, back, tab-close simulation, offline queue, slow save, failure retry, expired auth, duplicate completion, and resume on phone, tablet, and desktop.

## Sample workout

**Outcome and navigation:** A guest can try the runner interaction with representative values while understanding that the activity is temporary and does not become history.

**UI states:** Show fresh sample, in-tab progress, reset, refresh-restored tab state when supported, expired tab, and offline sample. Every completion surface states **Sample workout not saved**.

**Domain and persistence:** Sample fixtures use separate identifiers and session-scoped storage. They never call authenticated mutation endpoints or analytics projections.

**Security and privacy:** No guest note or entered value is sent to the server. Reset removes the tab-scoped sample state.

**Device and accessibility behavior:** The sample uses the same accessible controls and responsive runner component with a guest persistence adapter.

**Acceptance, tests, and evidence:** Tests verify zero mutation requests and sample labeling at entry, save status, completion, and analytics links. Browser evidence shows completion, reset, refresh, and network inspection.

## History

**Outcome and navigation:** A user can browse completed and abandoned sessions, filter by date, day, or exercise, and open an immutable session detail.

**UI states:** Show first-use empty, list, filters, no filtered results, pagination, loading, error, deleted custom-exercise label fallback, and offline unavailable private history.

**Domain and persistence:** History reads workout snapshots, not mutable program names. Pagination uses stable cursor ordering. Session detail exposes set and cardio logs with preferred presentation units.

**Authorization and privacy:** Every query includes owner. Export is out of initial scope. Private history is not service-worker cached.

**Device and accessibility behavior:** Phone uses a chronological list and disclosure detail. Desktop can show list and selected session. Filters remain keyboard accessible and dates include readable labels.

**Acceptance, tests, and evidence:** Tests cover snapshot immutability, pagination, filters, units, deleted references, and IDOR. Browser evidence covers empty, populated, filter-empty, session detail, unit change, and cross-user denial.

## Personal records

**Outcome and navigation:** A user can inspect best weight, repetition, duration, distance, volume, and estimated one-repetition maximum records where meaningful and trace each result to its source workout.

**UI states:** Show no records, records by type, ties, unsupported metric, recalculation pending, stale projection error, and source session unavailable during deletion.

**Domain and persistence:** Record rules compare canonical values and store calculation version and source log. Ties are labeled. Unsupported logging kinds do not render irrelevant records.

**Authorization and privacy:** Record and source lookup share the owner boundary. Recalculation is idempotent and cannot accept a client UID.

**Device and accessibility behavior:** Cards remain a semantic definition list. Trends or rank indicators include text. Phone prioritizes record and date; desktop adds source context.

**Acceptance, tests, and evidence:** TDD covers ties, rounding, conversions, warm-up exclusion, bodyweight handling, Epley eligibility, versioned recalculation, and ownership. Browser evidence covers no data, multiple types, tie, unit switch, and source navigation.

## Progress analytics

**Outcome and navigation:** A user can understand training consistency, volume, estimated strength, and cardio trends from persisted completed data. Guests see a clearly labeled sample dataset.

**UI states:** Show sample, no personal data, partial data, metric unavailable, selected date range, loading, calculation error, and projection refresh. No chart fabricates missing points.

**Domain and persistence:** Summaries are reproducible from source logs, carry a calculation version, and group by user time zone. Sample summaries live in code fixtures. Volume, Epley, pace, distance, and duration use canonical calculations before presentation conversion.

**Authorization and privacy:** Personal analytics require owner-scoped reads. URLs can encode nonsecret filters but not a UID. Operational telemetry is distinct from fitness analytics.

**Device and accessibility behavior:** Every chart has a visible title, legend, noncolor marks, focusable points when useful, and a table summary. Phone uses one chart per section; larger screens can compare compatible metrics.

**Acceptance, tests, and evidence:** Tests cover empty and sparse series, time zones, units, date boundaries, calculations, sample separation, and ownership. Browser evidence covers sample labels, empty user, populated user, keyboard chart access, dark mode, and all viewports.

## Settings and preferences

**Outcome and navigation:** A user can set weight and distance units, time zone, cardio defaults, reduced-data preferences, equipment, sign out, and reach account deletion.

**UI states:** Show loaded, dirty, validation error, saving, saved, failed, offline read-only, unverified restriction, stale profile, and sign-out failure with safe retry.

**Domain and persistence:** Preferences are owner-scoped and versioned for conflict detection. Unit changes affect input and presentation only; canonical stored records remain unchanged.

**Authorization and privacy:** Server derives owner. Sign-out clears secure session and local user drafts. Sensitive values and Firebase internals never render.

**Device and accessibility behavior:** Settings use semantic sections and native controls where possible. Save status is textual. Destructive actions are separated from ordinary preferences.

**Acceptance, tests, and evidence:** Tests cover conversion presentation, canonical storage invariance, conflicts, CSRF, sign-out cleanup, and ownership. Browser evidence covers unit changes across runner, history, and analytics; failed save; offline; and keyboard sign-out.

## Authentication, verification, and recovery

**Outcome and navigation:** A visitor can register with email/password, sign in with Google or password, verify email, recover a password, and return to the intended same-origin route.

**UI states:** Show idle, SDK loading, invalid input, duplicate email, wrong credentials, popup cancelled, popup blocked, unverified, verification sent, resend cooldown, recovery requested without account disclosure, session exchange pending, expired token, revoked token, and server failure.

**Domain and persistence:** Firebase owns credentials. The application persists only the server session and user profile. Session exchange verifies ID token and creates the secure cookie. Recovery uses Firebase's supported flow and returns generic confirmation.

**Authorization and privacy:** CSRF and origin checks protect session routes. Error copy avoids account enumeration. Return URLs are same-origin. Unverified password accounts cannot perform permanent mutations.

**Device and accessibility behavior:** Forms use autocomplete tokens, persistent labels, error summaries, and focus management. Popup flows provide redirect fallback. Phone keyboards receive appropriate input modes.

**Acceptance, tests, and evidence:** Integration tests cover invalid, duplicate, unverified, expired, revoked, CSRF, origin, and session-cookie attributes. Browser evidence covers Google and password happy paths when credentials exist, cancellation, duplicate registration, verification gate, recovery, expired session, and redirect preservation.

## Account deletion and reauthentication

**Outcome and navigation:** A user can understand the deletion scope, reauthenticate, confirm a deliberate destructive action, and receive a truthful result or retry state.

**UI states:** Show impact review, phrase confirmation, reauthentication required, provider-specific reauth, pending deletion, database failure, Firebase failure after database deletion, completed deletion, and restricted retry job.

**Domain and persistence:** A deletion saga records a minimal job. The owned-data transaction removes programs, custom exercises, sessions, logs, records, summaries, and profile data. Firebase deletion follows. A partial failure restricts the identity and retries without restoring deleted fitness data.

**Authorization and privacy:** Require verified session, recent authentication, CSRF, exact confirmation, and owner derivation. Another user cannot target an account identifier. Clear cookies, client SDK identity, service-worker private caches, and IndexedDB namespaces.

**Device and accessibility behavior:** Destructive confirmation is a labeled dialog or page with focus control and no default destructive focus. Copy states irreversibility plainly.

**Acceptance, tests, and evidence:** Tests cover reauth freshness, wrong provider, CSRF, duplicate delete, database rollback, Firebase partial failure, ownership, and local cleanup. Browser evidence covers password and Google reauth when credentials exist, cancellation, failure, retry, and post-deletion protected-route denial.

## PWA install and offline recovery

**Outcome and navigation:** A visitor can install the app where supported. Public content remains useful offline, and an authenticated runner retains honest local draft state without implying server persistence.

**UI states:** Show install available, installed, unsupported, dismissed, update available, offline shell, cached public data, private route unavailable, pending runner operations, retrying, conflict, and auth required.

**Domain and persistence:** The manifest defines identity, icons, theme colors, display mode, scope, and shortcuts. The service worker versions public caches. IndexedDB stores runner operations by UID and session with an explicit schema version.

**Authorization and privacy:** Never cache authenticated HTML, cookies, session responses, private history, or analytics. Clear user namespaces on sign-out and deletion. Update activation does not discard pending operations.

**Device and accessibility behavior:** Install guidance is optional and dismissible. Offline and update banners are landmarks with nonblocking announcements. Standalone mode respects safe areas and keyboard focus.

**Acceptance, tests, and evidence:** Tests cover manifest schema, cache allowlist, denylist, IndexedDB migration, UID isolation, update preservation, and retry ordering. Browser evidence covers installability audit, offline public navigation, offline runner queue, refresh, update, reconnection, auth expiry, and dark/reduced-motion standalone behavior.
