# Repository instructions

Read `/Users/vishal/.codex/AGENTS.md` before implementation work. Then read the project memory in this order:

1. `docs/context/STATUS.md`
2. `docs/context/PROJECT.md`
3. `docs/context/DECISIONS.md`
4. `docs/context/SOURCES.md`
5. `docs/wiki/index.md`

## Product and engineering rules

- Treat the raw reference recording and every derived audio, transcript, frame, or curation scratch report as private. Never commit or publish them.
- Write or update the relevant plan in `docs/plans/` before implementing a feature, flow, or page. Cover outcomes, navigation, states, types, persistence, authorization, failure recovery, responsive behavior, accessibility, privacy, acceptance criteria, tests, and browser evidence.
- Use test-driven development for domain rules and transformations. Retain concise evidence that a meaningful test failed before its implementation and passed afterward.
- Keep Firebase UID ownership checks on the server. Never trust a UID supplied by a client.
- Keep weight in kilograms and distance in meters in storage. Convert only at presentation and validated input boundaries.
- Preserve immutable workout and program-revision snapshots. Equipment changes must create a confirmed active-program revision and must not rewrite history.
- Never seed, approve, or publish an exercise video that the curation policy has not accepted and a human has not watched in full.
- Keep secrets in local or Vercel environment variables. Commit only `.env.example` with empty values and setup notes.
- Keep project-owned Markdown and generated HTML documentation in parity. Use `pnpm docs:build` and verify with `pnpm docs:check` after the package scripts exist.
- Keep only the newest completed QA evidence in `docs/qa/latest/`. Remove superseded generated evidence after the replacement is verified.

## Production quality bar

These rules came out of the September 22, 2026 whole-application audit (`docs/plans/PRODUCTION-GRADE-AUDIT.md`). Apply them to every change.

### Interface copy

- Write for a person holding a phone between sets: short, direct, second person, plain words. One idea per sentence.
- Never show implementation vocabulary: snapshot, immutable, canonical, seeded, topology, idempotent, reconcile, revision number, namespace, Firebase, server session, route (meaning routine), catalog record, operation, domain. Say "routine", "workout", "library", "saved", "on this device".
- Never show raw error codes, schema paths, or field identifiers such as `weightKg`. Map them to a sentence that says what happened and what to do next.
- Do not repeat policy disclaimers on ordinary screens. State truthful constraints once, where they matter: guest activity is not saved, the app does not prescribe load, videos appear only when approved.
- Eyebrows and badges must carry information the heading does not. Remove decorative labels such as "Field notes", "Session control", and "Owned programs".
- Use one name per concept: routine (not program or route), movement or exercise consistently within a screen, Today, Library, Progress, Settings.

### Workflows

- Every destructive or irreversible action (abandon, skip, delete, discard, sign out with unsynced work) needs a confirmation step or an undo.
- Every error state offers a way forward: retry, discard, go back, or sign in again. A button that only repeats the same failure is not recovery.
- When a step, set, or view changes and the focused control disappears, move focus to the new heading and announce the change once.
- Validation appears next to the field it concerns, uses `aria-invalid` and `aria-describedby`, and clears when the field is corrected.
- Account-level pages (Settings, sign-out, deletion) work before a routine exists.
- Members stay inside the member layout. Links from `/app` must not drop into public pages.

### Visual system

- All pages, public and member, use the Quiet Set system in `DESIGN.md` and the shared shells (`PublicShell`, `AuthenticatedShell`). Do not reintroduce the retired all-caps atlas typography or page-specific headers.
- Page content keeps the shared horizontal gutter; nothing touches the viewport edge except full-bleed artwork.
- Check 390 px and 1440 px widths for overlap, clipping, and horizontal scroll before calling UI work done.
- Prefer editing an existing rule over adding a later override. Delete CSS that no markup references.

### Verification discipline

- Running several Next.js servers and the full test suite at once can exhaust memory (exit 137). Run one heavy process at a time.
- Public illustration folders must contain only served assets. Provenance sidecars live under `docs/design/provenance/`.

## Git closeout

For each authorized implementation iteration, use a feature branch, push it, merge it into `main`, update local `main` to the identical commit, and remove completed worktrees. Record any active or unresolved worktree and its reason in `docs/context/STATUS.md`.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
