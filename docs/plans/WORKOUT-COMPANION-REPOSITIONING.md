# Workout companion repositioning plan

## Outcome

My Workout Pal is a workout companion for planning, completing, and reviewing a personal routine. It is not a five-day fitness prescription. The existing five-day route remains available as one editable example that shows how the product can look after setup.

A member can sign in with Google or email, immediately see an unmistakably private account surface, create a routine with their own day names and order, add or remove movements, use the built-in library, attach private guidance links when the app has no approved demonstration, log workouts, and review progress. Guest pages explain these capabilities without presenting the example routine as the product.

## Evidence behind this plan

The current release has several structural gaps that match the reported experience:

- A bare `/sign-in` normalizes its missing return target to `/`. After Firebase creates the secure server session, the client replaces the document with that public route. The result looks like a refresh back to the guest home page even when authentication succeeded.
- The public shell always renders **Sign in**, and public program days always render the starter preview. Neither surface exposes the server session or routes a signed-in visitor to their owned routine.
- The protected `/app` surface already renders the viewer name, verification state, account navigation, onboarding, and active program. The ordinary sign-in entry path does not send the user there.
- The publication schema requires exactly five days in the fixed Push, Pull, Legs, Upper, and Lower order. It also requires a Core section and both Walker and Runner cardio templates on every day.
- The editor can rename the five existing days and edit their movements, but it cannot add, remove, or reorder days. Its section constraints also prevent a fully personal routine.
- The canonical catalog has 27 movements. Private custom exercises can store zero to two YouTube links, but a member cannot select a canonical movement and attach their own private guidance link from the chooser.
- Public navigation calls progress **Sample**, while the progress preview repeats sample language in the route title, page title, banner, metrics, chart, and supporting copy.
- The landing metadata, hero, example-route section, PWA description, and several member surfaces position the five-day routine as the main offer.
- The animal illustration is warm and distinctive, but it appears only in the landing hero. Most product surfaces rely on dark atlas fields, stamps, uppercase headings, and ruled panels, which makes the companion feel formal and operational.

The live public audit covered `/`, `/sign-in`, `/program`, and `/sample-progress` on August 27, 2026. It confirmed the copy, navigation, and visual hierarchy described here. Completing Google sign-in was outside this read-only planning pass; the exact production journey remains an implementation acceptance test.

## Product contract

### Guest experience

- The root page explains that the app helps a person plan a routine, use it during training, review form guidance, log work, and track progress.
- The primary action is **Create my workout plan** or **Open my workouts**. The secondary action is **Explore an example routine**.
- The public example is called the **five-day starter example** only where the template itself is visible.
- Public navigation uses **Progress**, not **Sample**.
- The progress preview contains one persistent disclosure: **Sample data · not your history**. Other headings and metrics use ordinary labels such as **Progress**, **Workouts**, **Consistency**, and **Cardio**.
- Action-level warnings such as **Not saved** remain where a guest could otherwise mistake an interaction for persistence.

### Authentication and account state

- A successful bare Google or email sign-in opens `/app` by default.
- A valid private `returnTo` path still wins, including Settings and an interrupted workout. Missing, repeated, hostile, malformed, or auth-loop values fall back to `/app`.
- The full-document navigation remains because the secure HTTP-only session cookie must be visible to Server Components.
- The first private document shows the member's name, verification state, account navigation, and **Sign out** action.
- Public cached pages stay identity-neutral. Their account action becomes **My workouts** and targets `/app`; the protected layout resolves signed-in versus signed-out behavior.
- Signing in alone creates no program, workout, or analytics data.
- Authentication errors remain on the sign-in surface with a visible, actionable message.

### Signed-in home

The `/app` route becomes a personal home instead of a marketing surface or a program-only screen. It supports the following states:

- New account: choose **Start with the example** or **Start blank**, then set a routine name and presentation preferences.
- Ready account: continue or start a workout, choose a day, edit the active routine, open the library, and see a bounded recent-progress summary.
- Active workout: resume is the dominant action, and starting a competing session is unavailable.
- Unverified password account: browsing remains available, while permanent actions clearly explain the verification requirement.
- Persistence failure: account identity stays visible, entered data stays in place, and retry does not duplicate the operation.
- Empty history or progress: show a useful first action and never substitute sample data.

### Flexible routines

The starter is a template, not a schema rule. The implementation uses bounded limits for payload and database safety without exposing a five-day product constraint:

- A routine contains 1-14 ordered days.
- A day has a stable opaque ID, a stable route key, an arbitrary 1-120 character display name, and a position derived from its order.
- Members can add, rename, duplicate, reorder, and remove days. Removing a nonempty day requires a review that names the movements that leave the next revision.
- A published training day contains 1-40 movements and no more than 200 movements across the routine.
- Sections are optional organizational groups. They have arbitrary names and order. Strength, Accessory, and Core are starter labels, not mandatory kinds.
- Core work is optional. Cardio is optional. Walker and Runner are example cardio choices, not required paired templates.
- The editor preserves unsaved work across ordinary day selection. Navigation away from a dirty draft requires a clear discard choice.
- Publication creates a complete immutable revision. Earlier program revisions and workout snapshots never change.
- Starting a workout snapshots the selected day's name, section labels, movement meaning, targets, guidance, and optional cardio.
- Equipment changes preview and revise only incompatible movements in the active published routine. They do not recreate missing starter days or mandatory sections.

These bounds are recommended implementation limits, not a claim that a useful routine must contain a certain number of days or movements. Revisit them only with payload-size and database evidence.

### Exercise library and personal guidance

- Every canonical movement can ship when it has a unique name, stable slug, logging kind, equipment requirements, movement family, search aliases, primary muscles, and concise reviewed instructions.
- Canonical video status is explicit: `not_started`, `in_review`, `approved_pair`, or `unavailable`.
- An `approved_pair` still requires exactly two unique, eligible, fully watched demonstrations and the existing curation evidence. A movement without an approved pair renders useful text guidance and no empty player.
- The app does not block a larger name-and-instruction library on video availability.
- A member can add a canonical or private movement from the routine editor's searchable chooser.
- If app video is unavailable or not preferred, the member can attach up to two owner-only HTTPS guidance links to the selected movement. The app labels them **Your link**, never **Approved**.
- Personal links can point to supported video or article URLs. Only allowlisted embed providers render in a frame; every other URL opens as an external link with safe opener and referrer behavior.
- Personal guidance belongs to the server-derived owner. It never changes the public catalog or another member's library.
- A workout snapshots the guidance attached when the session starts, so later edits do not change an in-progress or completed workout.
- A member can create a private movement without leaving the chooser, add optional instructions and links, save it, and return it as the selected movement.

The initial expansion inventory and content contract live in `docs/reference/EXERCISE-LIBRARY-EXPANSION.md`. Video research remains a separate private curation lane and cannot approve or publish a link without full human review.

## Navigation

The target information architecture is:

| Audience | Route | Primary purpose |
| --- | --- | --- |
| Guest | `/` | Understand the workout-companion promise and choose account setup or example exploration. |
| Guest | `/program` | Explore the five-day starter example. |
| Guest | `/library` | Browse the public canonical movement library. |
| Guest | `/progress` | Preview how progress works with one sample-data disclosure. |
| Guest or member | `/sign-in` | Create or resume a secure account session. |
| Member | `/app` | Resume, start, plan, and review from the personal home. |
| Member | `/app/programs` | Create, clone, activate, and manage routines. |
| Member | `/app/program/edit` | Add, remove, rename, and reorder days, sections, movements, and optional cardio. |
| Member | `/app/library` | Search compatible canonical and private movements. |
| Member | `/app/history` | Review immutable workout records. |
| Member | `/app/progress` | Review personal progress derived from completed workouts. |

Keep `/sample-progress` as a compatibility redirect to `/progress`. Existing public exercise return targets accept the canonical `/progress` route and normalize old compatible links.

## State, data, and authorization changes

### Program persistence

- Add a migration that replaces the database's 1-7 day-number check with the chosen 1-14 bound.
- Remove publish-time assumptions about five canonical keys, exact day order, mandatory Core, and paired cardio.
- Preserve stable day, section, prescription, and cardio identities while every publication writes new descendant rows.
- Add bounded day and routine aggregate validation before database construction.
- Keep at most one active program root and preserve owner-scoped create, clone, activate, and equipment-change transactions.
- Update starter creation so **Start with the example** clones the five-day template and **Start blank** creates a valid minimal routine without copying the template.

### Guidance persistence

- Store owner guidance separately from canonical catalog rows, keyed by the server-derived owner and exactly one catalog or custom exercise identity.
- Normalize URLs on the server, limit count and length, reject credentials, fragments when unsafe, non-HTTPS origins, loopback addresses, and unsupported schemes.
- Snapshot resolved guidance into workout exercise rows when a session starts.
- Include guidance in account deletion and ownership-isolation tests.
- Do not place personal URLs in analytics, public cache entries, logs, error messages, or curation artifacts.

### Authentication and caching

- Keep `/app`, authentication routes, account APIs, and owned media outside the public service-worker cache.
- Keep `/` identity-neutral so the existing public offline behavior does not leak or stale account state.
- Route public **My workouts** actions through the protected `/app` boundary instead of attempting to infer session state in cached HTML.
- Add a hosted-auth test that begins with the same bare public-header sign-in path a real visitor uses.

## Selected visual direction

The completed Wave 0 review compared three responsive image-based directions from the existing cartoon-gym visual world. On August 27, 2026, the user selected **Corner Companions** as the sole production direction for the Wave 3 pilot and any later approved rollout. The two alternatives were discarded, and their images, prompts, and direction-specific provenance are not retained on the concept branch.

Corner Companions places one larger contextual character vignette in reserved whitespace on each approved surface. The guest landing page uses a planning companion, the signed-in home uses a preparation companion, and the guest Progress preview uses a calm review companion outside the chart and sample disclosure. Phone layouts use a collapsible dedicated slot after the primary content. Desktop layouts keep the vignette out of the member account rail and data plane. The five-day example stays subordinate.

Generate purpose-built assets. Do not crop individual characters from the composite hero and present them as standalone artwork. Do not use emoji, handcrafted animal SVGs, copied characters, embedded text, a real person, private source material, or user data. Shipping assets retain prompt and transformation provenance beside the optimized raster files.

Decorative imagery must be ignored by assistive technology and pointer input, stay out from behind fields, charts, error states, timers, and workout controls, disappear in forced-colors mode, require no motion, and preserve tested text contrast. The selection unlocks the bounded pilot after its product dependencies are ready; it does not authorize implementation, publication, or rollout from this concept branch.

## Worktree and agent plan

Every agent owns a user-visible vertical outcome, its domain rules, persistence changes, UI, documentation, tests, and browser evidence. No two active worktrees edit the same migration, shell, or central manifest. The integration coordinator records every active worktree and its reason in `docs/context/STATUS.md`.

### Wave 0: Freeze contracts and choose a direction

| Agent package | Branch and worktree | End-to-end outcome | Dependencies |
| --- | --- | --- | --- |
| Authentication entry handoff | `vishal/auth-entry-handoff` | Public account action → Google or email → secure session → `/app` → visible member identity and sign out. | None. Merge first because it owns public account navigation. |
| Flexible routine publication | `vishal/flexible-routine-publication` | Create example or blank routine → add, rename, reorder, or remove a day → publish one immutable revision → read the same structure on `/app`. | None. Own the migration and publish contract. |
| Companion visual direction | `vishal/companion-concept` | Retain the selected Corner Companions guest/member/progress board, decision record, and production guardrails with no production code. | Selection complete. Wait for companion home and copy before the Wave 3 pilot. |

The coordinator creates `vishal/companion-integration` from the verified `main` commit. Each agent branches from that same commit, uses a separate worktree, pushes its branch, and requests integration without merging `main` independently.

### Wave 1: Make planning and guidance useful

| Agent package | Branch and worktree | End-to-end outcome | Dependencies |
| --- | --- | --- | --- |
| Build a day | `vishal/flexible-day-builder` | Open an owned routine → add, remove, replace, and reorder movements and optional sections/cardio → publish → start the exact saved day. | Flexible routine publication. |
| Library and personal links | `vishal/library-guidance-foundation` | Search canonical/private movements → select one → attach a private guidance link or create a private movement inline → return it to the day → see the same guidance in the runner snapshot. | Flexible routine publication; consume the day-builder chooser interface without editing its shell. |
| Personal home and companion copy | `vishal/companion-home-copy` | Sign in → see personal home → resume/start/edit/review; guest landing explains the companion; public nav says Progress; one sample-data disclosure remains. | Authentication handoff and flexible routine publication. |

The day-builder agent owns the editor layout and day controls. The library agent owns catalog sources, guidance persistence, the chooser data contract, and the inline creation sheet. Freeze their typed interface before both branches begin so they can work in parallel without editing the same component.

### Wave 2: Expand content in isolated batches

After the library foundation moves catalog records into generator-backed category manifests, two agents can add reviewed name-and-instruction batches in parallel:

| Agent package | Branch and worktree | End-to-end outcome | Dependencies |
| --- | --- | --- | --- |
| Strength library expansion | `vishal/library-strength-expansion` | Add the upper-body and lower-body candidates from the inventory, generate canonical rows, search them, add representative movements to a routine, and verify missing-video states. | Library foundation. |
| Core and conditioning expansion | `vishal/library-core-conditioning-expansion` | Add the core, carry, conditioning, and mobility candidates, generate canonical rows, search them, add representative movements to a routine, and verify each logging shape. | Library foundation. |

Each batch edits only its category manifest and category tests. The generator owns the combined catalog, seed rows, search index, and documentation table. This prevents two content agents from colliding in one large TypeScript catalog file.

A later video-research agent works only in the ignored private curation checkpoint. It fills candidate evidence for the inventory, but it cannot mark a pair approved or change production data. Human full-watch review remains mandatory.

### Wave 3: Apply the selected visual system

| Agent package | Branch and worktree | End-to-end outcome | Dependencies |
| --- | --- | --- | --- |
| Animal surface-system pilot | `vishal/pal-visual-pilot` | Apply the selected direction to guest landing, personal home, and progress preview; verify phone/desktop, contrast, forced colors, reduced motion, and offline asset behavior. | User concept selection and companion home/copy. |
| Animal surface-system rollout | `vishal/pal-visual-rollout` | Extend the approved pilot to Library, routine editor, History, Settings, and workout surfaces without covering critical content. | Pilot approval. |

Do not begin the rollout until the pilot is reviewed in the browser. The rollout uses the pilot's tokens and placement component rather than page-specific background CSS.

### Wave 4: Integrate and release

The coordinator merges reviewed branches into `vishal/companion-integration` in this order:

1. Authentication entry handoff.
2. Flexible routine publication.
3. Build a day and library guidance foundation after their shared interface check.
4. Personal home and companion copy.
5. Strength and core/conditioning library batches.
6. Animal visual pilot and approved rollout.
7. Documentation, generated asset, service-worker, and production verification closeout.

Resolve integration failures in the owning branch when possible. Do not perform broad conflict resolution directly on `main`. After the combined release passes, push the integration branch, merge it into `main`, update local `main` to the identical commit, remove every completed worktree, and record any intentionally unresolved worktree with its reason.

## Test-driven implementation

Each functional package retains concise red-to-green evidence for its domain rules. Minimum coverage includes:

- Missing sign-in return defaults to `/app`; safe deep returns remain exact; hostile and repeated values fail closed.
- The ordinary public-header Google journey reaches visible member chrome in hosted production.
- Program publish accepts non-five-day structures and rejects zero days, duplicate stable keys, out-of-bound totals, foreign custom exercises, and stale base revisions.
- Add, rename, duplicate, reorder, and reviewed removal preserve immutable prior revisions.
- Optional section and cardio shapes survive repository round trips and runner snapshot creation.
- Library search handles expanded names, aliases, equipment, muscles, and logging kinds.
- Canonical entries without approved videos show instructions and no empty or unapproved embed.
- Personal guidance URLs are owner-scoped, normalized, bounded, safely rendered, snapshotted, and deleted with the account.
- Public navigation says **Progress**; the preview contains one visible sample-data disclosure; signed-in progress never renders sample values.
- The member home covers new, ready, active-workout, unverified, empty-progress, slow, and failure states.
- Decorative assets never enter accessible names, focus order, pointer targets, private caches, or forced-colors output.

## Browser evidence

Every package verifies phone, tablet, and desktop behavior in Chromium and the supported WebKit lanes. The combined release must replay these real-user journeys:

1. Open the public home, use the account action, complete Google sign-in, arrive at `/app`, and identify the signed-in account without creating fitness data.
2. Start blank, create a two-day routine with personal names, add a third day, reorder it, remove one day after review, and reload the published result.
3. Open a day, add a catalog movement, attach a personal guidance link, create a private movement inline, publish, start the workout, and verify the snapshotted guidance.
4. Open Progress as a guest and see one sample disclosure; open personal Progress after completed workouts and see only owned data.
5. Exercise the selected animal treatment at 200% zoom, forced colors, reduced motion, narrow phone, tablet, and desktop widths without overlap, illegible text, or unreachable controls.
6. Load public cached routes offline and confirm that authenticated HTML, personal links, APIs, and owned media were never cached.

Retain only the newest completed evidence under `docs/qa/latest/`. Local green tests do not replace preview and production replay.

## Privacy and safety

- Derive Firebase UID only from the verified server session.
- Treat routine names, private movements, personal guidance URLs, workout notes, history, and progress as private account data.
- Keep canonical units in storage and convert only at validated input and presentation boundaries.
- Never rewrite an earlier routine revision or workout snapshot.
- Never publish or label a video as approved before mechanical eligibility and full human review.
- Never turn a member-provided link into a public catalog recommendation.
- Do not make medical, rehabilitation, or outcome claims in movement copy.
- Keep the private recording and all derived curation scratch artifacts outside Git and deployment.

## Completion criteria

This repositioning is complete only when all of the following are true:

- Bare Google sign-in works from the public header and visibly lands in the private account.
- The app never leaves a signed-in person wondering whether they are signed in.
- The public landing and global metadata sell a workout companion, not a five-day solution.
- The signed-in home is personal and action-oriented.
- Members can create a non-five-day routine with arbitrary day names and edit its movement count and order.
- The five-day route appears only as an editable example template.
- The public and private libraries expose the expanded reviewed movement inventory.
- Missing app videos do not block a movement name and instructions from being useful.
- Members can attach private guidance links without changing the public catalog.
- Public navigation says **Progress**, and one sample-data disclosure is sufficient on the preview.
- The selected animal system appears across the approved surfaces without harming readability, accessibility, performance, privacy, or workout operation.
- All focused tests, complete verification, documentation parity, public and authenticated browser matrices, preview checks, production replay, and bounded error-log review pass.
- The merged `main`, GitHub `main`, production source, and local `main` point to the same commit, and completed worktrees are removed.
