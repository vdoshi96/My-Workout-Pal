# Authenticated program customization and insights plan

## User outcome

A verified member can turn either five-day starter into a genuinely personal program without weakening the immutable-history model. The member can create, clone, activate, and rename owned programs; create a compatible private movement; add, replace, remove, and reorder exercises; add, rename, reorder, or remove a day section; edit sets, ranges, targets, notes, rest, day labels, and cardio templates; preview and confirm an equipment change; change presentation preferences; and then see personal records and progress derived from completed owned workout data.

The flow must prove that customization affects only the active published revision. A completed workout keeps its original exercise, equipment, target, unit, note, and cardio meaning after later program edits or a dumbbell-to-barbell change. Guests retain the complete public read-only plan and exercise resources. Sign-in remains necessary only for owned customization and persisted training data.

This checkpoint extends the credential-free authenticated fixture. It does not claim literal offline behavior, post-load authentication expiry, multi-tab conflict resolution, account deletion, hosted Firebase, email delivery, Google consent, secure production cookies, authenticated production playback, or Vercel Spend Management. Those remain separately planned evidence lanes.

## Navigation

The production information architecture remains unchanged. The fixture adds only mirrors of real private routes beneath `tests/fixtures/authenticated-app`; no harness route enters `src/app`.

1. Verified synthetic Alice opens `/app`, creates or reuses a dumbbell starter, and establishes one completed Push workout through the already-proven runner boundary.
2. Alice opens the program collection at `/app/programs`, creates a barbell starter, clones an owned program, and explicitly activates the intended program. Exactly one program is active after every successful operation.
3. Alice opens `/app/library/custom/new`, creates a private weight-and-repetitions movement compatible with dumbbells and the barbell-enabled profile, and returns through the private library to the program editor.
4. At `/app/program/edit`, Alice renames a day and section, adds and reorders a missing section where applicable, adds the private movement, changes its sets, range, target, rest, and notes, changes cardio values, and publishes one immutable revision.
5. Alice returns to `/app`, opens the equipment-change preview, reviews every canonical substitution and custom-exercise compatibility result, and confirms the barbell-enabled revision only after the preview remains current.
6. Alice opens the historical Push route and verifies that the saved dumbbell workout is unchanged. She then opens `/app/settings`, changes units, time zone, and reduced-motion preference, and confirms that storage meaning did not change.
7. Alice completes a qualifying owned workout, opens `/app/prs`, and sees persisted personal-record projection rows. `/app/progress` presents totals and the daily series derived from completed set and cardio logs in the selected units and time zone.
8. Synthetic Bob attempts Alice's opaque program, custom-exercise, workout/history, and projection sources. Foreign and missing private resources remain indistinguishable, while Bob's valid empty progress surface contains none of Alice's values.

Browser navigation uses the visible application links and keyboard activation for material actions. Direct fixture API requests are limited to exact ownership, idempotency, cache, and database-effect assertions that cannot be observed safely through page copy alone.

## UI states

The program collection covers one program, multiple programs, active versus inactive, creating, cloning, activating, retrying, duplicate replay, stale expected-active revision, program-limit, foreign source, unverified read-only, and repository failure states. Forms retain entered names after a rejected or interrupted request and never navigate on an unvalidated response.

The custom exercise editor covers empty private library, creating, saved, malformed input, duplicate video, incompatible equipment, zero-to-two videos, unverified read-only, stale edit, in-use deletion refusal, foreign or missing identity, slow request, server failure, and retry with the same idempotency key. This lane creates and uses one private movement; account-wide deletion remains later.

The program editor covers clean draft, dirty draft, day selection, searchable compatible exercise choice, no compatible result, add/replace/remove/reorder movement, add/rename/remove/reorder section, invalid empty section, incompatible logging shape, invalid range, unpublished navigation warning, publishing, saved revision, stale base revision, owner-custom movement deleted in another request, malformed success, server failure, and retry. No local draft is called saved before the repository returns the complete new active revision.

The equipment surface covers current profile, proposed profile, no substitutions, multiple canonical substitutions, compatible custom movements, incompatible custom blockers, stale preview, confirmation pending, saved revision, duplicate replay, failure, cancel, and unverified read-only. Confirmation copy states which values remain and which movement-specific targets clear.

Settings covers unchanged, dirty, saving, saved, invalid IANA time zone, stale `updatedAt`, slow response, server failure, retry, unverified read-only, and reduced-motion state. The account-deletion section remains visible but is outside this fixture slice and must not report synthetic success.

Personal records cover empty, one winner, exact ties, multiple metric kinds, metric and imperial presentation, missing custom-exercise display fallback, and source-history links. Progress covers empty, derived completed-workout totals, abandoned-session exclusion, daily series, selected time zone, canonical-to-display conversion, and missing source protection. Loading and route error boundaries never substitute sample analytics for account data.

## Domain types and invariants

The existing `ProgramPublishInput` remains the only publish envelope. It keeps exactly the five canonical day keys in order, one walker and one runner template per day, bounded names and notes, and exactly one catalog or owner-custom identity per prescription. The client never supplies owner identity, publication status, revision number, logging kind, equipment truth, or a persistence outcome.

Section editing receives pure helpers before UI work. A day may contain each of `strength`, `accessory`, and `core` at most once and must retain at least one section. A section has a stable draft key, a bounded nonblank title, a position derived from array order, and at least one prescription at publication. Adding is limited to a missing kind; moving normalizes section and prescription order without mutating the input; renaming trims only at schema validation; and removing a nonempty section requires an explicit review that names the exercises removed from the unpublished draft. Adding then cancelling exercise selection leaves an honest invalid empty section until it is populated or removed. Published starter days still include core, while an owned customized revision may intentionally change its section composition.

Program collection invariants remain at most 24 roots per owner, exactly one active root after onboarding, a complete five-day published revision per active root, and owner-scoped clone sources. A clone copies the complete revision graph using new opaque row IDs and preserves catalog or same-owner custom references without sharing mutable descendants.

A custom exercise has one owner, a bounded unique name within that owner, one logging kind, one or more required equipment IDs, original instructions, bounded aliases, and zero-to-two normalized unique YouTube IDs. Its logging kind cannot reinterpret a referenced program, workout snapshot, personal record, or progress row. Equipment compatibility is resolved from server rows, never from a client label.

Equipment confirmation accepts the active program ID, exact base revision ID, target profile, and retry-stable idempotency key. The server recomputes the equipment-change preview. Canonical substitutions retain sets, compatible ranges, rest, section, order, and notes; movement-specific targets clear when meaning is incompatible. Compatible custom movements remain referenced. Any incompatible custom movement blocks confirmation. The operation creates one active revision and never rewrites another program or an immutable workout snapshot.

Personal-record projection is a versioned deterministic transformation executed inside the successful `complete_session` transaction. It considers only work sets belonging to exercises marked completed and uses the effective catalog or custom exercise identity after a valid substitution. Warm-up sets and skipped exercises never produce candidates. Candidate metrics are:

- weight and repetitions: maximum weight, repetitions, per-set volume, and Epley estimated one-repetition maximum;
- bodyweight repetitions: repetitions;
- duration: duration;
- distance and duration: distance and duration.

Every finite nonnegative candidate is rounded to the database's canonical scale, links to its exact owner-scoped source set, records one calculation version and achieved timestamp, and inserts idempotently under the existing owner/exercise/type/source uniqueness constraints. The read model chooses the maximum candidate for each exercise and metric, preserves every exact winning tie, and links only to owned source sessions. Replaying completion cannot duplicate a row or change its value.

Progress remains a read projection from persisted terminal sessions, work-set/cardio rows, and owner preferences. Completed sessions contribute; abandoned or resumable sessions do not inflate totals. Weight is canonical kilograms, distance canonical meters, duration integer seconds, and the selected unit system and IANA time zone affect presentation and grouping only. Existing optional summary rows report projection metadata but never override contradictory source logs.

## Persistence contracts

The isolated fixture applies the real migrations and deterministic starter/video seed to one in-memory PGlite database per test scope. It creates only synthetic Alice and Bob profiles. Fixture route adapters invoke production request schemas, CSRF checks, repositories, read models, and client components. They do not connect to Neon, copy SQL business rules, or hard-code successful response bodies.

Program create, clone, activation, publication, and equipment confirmation remain owner-scoped serializable transactions with retry-stable idempotency receipts. A stale base or expected-active revision rolls back without changing the active pointer. Custom exercise creation reserves its owner-scoped operation key and writes exercise, equipment, aliases, and videos atomically. Preference updates use optimistic `expectedUpdatedAt` and preserve canonical workout rows.

Section title and order persist in new immutable program-section rows created by publication. Removing or reordering an unpublished section mutates only browser draft state until a successful publish. Earlier revisions, sessions, exercise snapshots, set logs, cardio logs, personal-record candidates, and progress sources remain byte-stable.

Personal-record candidates are inserted in the same transaction that marks the workout completed. A late projection failure rolls back both the projection and terminal session state rather than leaving a completed workout with partial records. The existing operation idempotency receipt returns the original terminal meaning on replay. Progress queries remain read-only and owner filtered.

## Authentication and authorization

All production pages derive the viewer from the revocation-aware HTTP-only Firebase session. Every permanent mutation requires a verified identity. The credential-free fixture begins with one immutable server-derived synthetic viewer selected out of band before navigation; request bodies, paths, query parameters, local storage, and screenshots never carry a selectable UID.

Private mutations preserve the production order: same-origin double-submit CSRF, authenticated and mutation-eligible viewer, bounded body, strict schema, then database construction and owner-scoped repository work. Every private response, including authentication, validation, foreign, missing, conflict, and injected failure outcomes, contains `Cache-Control: private, no-store` or an equivalently strict no-store directive.

Alice and Bob have distinct fixed owners. Bob's foreign program, revision, custom exercise, workout, history source, set source, and personal-record source must match a random missing identifier in status, stable code, normalized body, cache headers, and database effect. Bob's ordinary progress page is a valid owner-scoped empty read, not a 404; it must contain zero Alice identifiers, values, names, notes, or counts. Unverified Alice may inspect private read models but cannot create, publish, confirm equipment, save preferences, or complete a workout.

Hosted Firebase registration, password verification/recovery, Google consent, cookie exchange, post-load expiry, revocation, and recent-auth deletion are not simulated by this lane.

## Loading, empty, error, interrupted, and worst-case behavior

Server Components use the existing private loading and error boundaries. Missing profile or active program returns to onboarding. Corrupt program graphs, zero or multiple active rows, missing source records, and projection rows whose source is foreign or absent fail closed; the UI never invents a replacement active program or sample statistic.

Every client mutation keeps a single idempotency key across slow, failed, malformed, and ambiguously interrupted responses. Controls are disabled only while their own operation is pending. A successful repository write followed by a bounded injected `500` is reconciled by replay or fresh server render without creating a second root, revision, custom exercise, preference update, or personal-record candidate. A response that fails structural parsing never advances local state.

A stale editor or equipment preview preserves the visible draft/review and asks for reload; it never silently rebases. A custom exercise deleted or made incompatible before publication returns the same safe result as unavailable input and leaves the active revision unchanged. A late database failure during clone, publish, equipment change, preference update, completion, or personal-record projection rolls back the whole transaction.

The worst path for this lane is: a completed historical dumbbell workout exists; Alice edits and publishes an active program; another accepted request advances the base revision while the response is lost; Alice attempts a stale equipment confirmation; and Bob probes the historical source. Recovery must show the server-confirmed current revision exactly once, reject the stale confirmation, preserve the old workout snapshot, and disclose nothing to Bob.

Literal offline events, page-close recovery, another-tab writes, and post-load auth expiry are deliberately not claimed here because they require the separate interruption/conflict lane.

## Mobile, tablet, and desktop behavior

The scoped journey is inspected at 390-by-844 phone, 820-by-1180 tablet, and 1440-by-1000 desktop sizes. Chromium covers all three; WebKit covers phone and desktop for dialogs, collection actions, editor section controls, equipment review, preferences, record links, and progress. Logical DOM order and persistence meaning do not change with layout.

On phones, collection cards, editor sections, custom exercise fields, equipment substitutions, settings, records, and timeline points stack above the fixed safe-area navigation. Dialogs become bounded scrollable sheets and keep their title and terminal controls visible. Tablet uses a readable split only when both panes remain usable. Desktop keeps bounded line lengths and does not strand editor actions below an independently scrolling pane. No surface has horizontal overflow at 200 percent zoom.

## Accessibility

Keyboard-only evidence covers private navigation, create/clone/activate, custom exercise fields, exercise and section chooser dialogs, section and movement reorder controls, publish, equipment preview/confirmation, preferences, record source links, and progress-to-history navigation. Dialog focus moves to the title or first field, stays trapped by the native dialog, and returns to the invoker on cancel or completion. Dirty-draft navigation warnings remain keyboard equivalent.

Every control has a visible label and truthful accessible name. Active program/profile and saved state use text plus semantic state rather than color alone. Errors use an alert only when immediate action is required; pending and success copy uses a polite status region. Section reorder announcements name the section and direction. Charts retain textual totals, `<meter>` labels, dates, and source links, so no value is available only visually.

Serious and critical Axe scans cover collection, custom exercise create, dirty editor, visible editor validation failure, equipment review, settings saved/error, records including a tie, progress, and the preserved historical workout. Tests also inspect focus visibility, reduced-motion preference, dark mode, forced colors where supported, touch-target reachability, and zero horizontal overflow.

## Privacy and security

All browser evidence uses fixed synthetic names, workouts, notes, weights, and program labels with the visible local-harness banner. No Firebase, Neon, Postgres, Google ADC, YouTube API, Vercel, OIDC, or user credential enters either child process. The runner keeps its explicit environment allowlist and exact-loopback binding. Third-party video documents remain deterministically inert; this lane does not claim live media.

The fixture may adapt transport only at a narrow injectable boundary. Production source must contain no harness header, viewer selector, scenario switch, fixture import, synthetic identity, or test route. The production build manifest must remain free of every fixture route. Private responses are no-store, textual values render through React, identifiers stay opaque, request sizes remain bounded, and logs/screenshots contain no cookie, CSRF value, credential, raw request body, or real fitness data.

Only the newest completed QA screenshots remain. Raw traces, videos, temporary databases, generated fixture output, and failed screenshots stay ignored and are removed after a replacement run is verified.

## Acceptance criteria

- Both dumbbell-only and barbell-enabled owned starters remain complete five-day programs with core and walker/runner defaults before customization.
- A verified member can create, clone, and activate programs, with exactly one active root and no mutation to another root's published graph.
- A verified member can create one compatible custom exercise and use it in the active program; a foreign, missing, or incompatible custom exercise cannot be published.
- The editor can add, rename, reorder, and remove sections; add, replace, reorder, and remove exercises; and edit day names, sets, ranges, targets, rest, notes, and cardio. Publication creates one immutable revision.
- Equipment-change preview lists exact canonical substitutions, retains compatible custom exercises, blocks incompatible ones, recomputes on the server, and requires explicit confirmation.
- An immutable workout snapshot recorded before editing and equipment confirmation renders the same exercise names, targets, units, set/cardio values, and notes afterward.
- Completing a workout transactionally creates deterministic, idempotent personal-record projection candidates from eligible work sets. Warm-ups, skipped exercises, foreign sources, invalid values, and replay do not create records.
- Personal records preserve exact ties and link only to owned source history. Progress totals and series derive only from persisted completed owned logs, exclude interrupted/abandoned sessions, and contain no sample values.
- Preference changes alter display units, date grouping, and motion presentation only; canonical kilograms, meters, seconds, historical snapshots, and record values do not change.
- Alice/Bob foreign and missing private-resource outcomes are indistinguishable, no-store, and side-effect equivalent. Bob's valid empty insights disclose none of Alice's data.
- Chromium phone/tablet/desktop and WebKit phone/desktop complete the scoped journey with keyboard, serious/critical Axe, reduced-motion, dark-mode, forced-color where supported, console, page-error, HTTP-failure, and overflow collectors clean except for explicitly consumed failure scenarios.
- The fixture remains credential-free and absent from the production route manifest. No provider, Neon, Vercel, spend, or production state changes in this implementation lane.

## Automated tests and retained fail-first evidence

The first retained test is `tests/unit/authenticated-program-customization-insights-plan.test.ts`: it fails because this plan file is absent, then passes only after the complete plan contract exists. Product implementation begins only after that green checkpoint and primary architecture review.

Pure domain TDD adds fail-first tests for immutable section add/rename/move/remove behavior, missing-kind and at-least-one-section rules, stable draft keys, normalized ordering, invalid empty-section publication, and preservation of unrelated days. Component/model tests cover compatible custom exercise selection, draft retention after failure, focus restoration, destructive section review, and stale publication copy.

Repository TDD uses the real PGlite migration chain. It covers program create/clone/activate idempotency and owner isolation; complete graph cloning; custom exercise create/use/foreign denial; immutable publication and equipment substitution; preference optimistic concurrency; personal-record candidate generation for every logging kind; Epley rounding; work-set-only filtering; effective substituted identity; exact ties; completion replay; late projection rollback; progress exclusion/grouping; and Alice/Bob ownership.

Route and policy tests require the fixture collection, custom exercise, editor, equipment, settings, records, progress, and supporting private API adapters before the browser slice can pass. They assert delegation to production repositories, unchanged owner-free request bodies, CSRF ordering, no-store on every outcome, exact-loopback headers, environment allowlisting, source-marker absence, and production route-manifest exclusion. Missing routes and scenarios are retained as the first implementation red.

Playwright extends `pnpm test:e2e:authenticated` with bounded cases rather than a second harness command. Exact expected HTTP failure sets are asserted for Alice and Bob. Database-effect checks compare root, revision, section, prescription, custom exercise, preference, workout snapshot, personal-record, and progress-source counts before and after duplicate, stale, foreign, and failure operations. `pnpm verify` remains the non-browser aggregate; `pnpm test:e2e:release` remains the public production-mode matrix.

## Browser evidence required for completion

The primary agent must personally inspect the complete scoped journey in the production-mode fixture, not only Playwright output. Evidence must show:

- create, clone, activate, custom exercise, section editing, exercise editing, publish, and exact equipment-change preview/confirm through visible controls;
- a historical dumbbell workout before and after the active barbell revision, with identical immutable snapshot values;
- one visible rejected/stale or accepted-then-error state whose retry reconciles exactly once;
- settings changed to the alternate unit system and time zone without rewriting stored meaning;
- populated personal records including an exact tie and source-history navigation;
- populated progress totals/timeline derived from the completed fixture workout and an empty Bob surface;
- foreign versus missing API and rendered-route status, normalized body, cache-header, and zero-side-effect equivalence;
- keyboard focus paths, serious/critical Axe scans in ready and material error states, reduced motion, dark mode, phone/tablet/desktop geometry, clean first-party console/page errors, and exact HTTP collectors.

Retain only a minimal newest screenshot set: a desktop customized editor/revision, a phone equipment review with immutable-history return, and a tablet or desktop records/progress surface. Every image must display the synthetic-data banner and no real identity or credential. The QA record names the exact source commit, retained red failures, test/browser/viewport counts, production-route count, commands, and unproved hosted/offline/deletion/Spend boundaries.
