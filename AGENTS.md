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

## Git closeout

For each authorized implementation iteration, use a feature branch, push it, merge it into `main`, update local `main` to the identical commit, and remove completed worktrees. Record any active or unresolved worktree and its reason in `docs/context/STATUS.md`.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
