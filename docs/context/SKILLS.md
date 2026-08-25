# Project workflows

## Context retrieval

Read `AGENTS.md` and the context files before changing the repository. Verify code and deployed behavior because context notes can become stale.

## Feature planning

Update the applicable plan in `docs/plans/` before implementation. Record the user outcome, navigation, states, data invariants, persistence, authorization, recovery, device behavior, accessibility, privacy, acceptance criteria, tests, and evidence.

## Test-driven domain work

For domain behavior or transformations, first add a test that fails for the intended reason. Capture the failing test name and result in the latest QA note. Implement the narrow behavior, rerun the test, then run its broader suite.

## Documentation parity

Edit Markdown as the canonical source. Generate matching HTML with `pnpm docs:build` and verify byte-for-byte source metadata with `pnpm docs:check`.

## Video curation

Run the resumable curation command only with an official YouTube Data API v3 key. Review the generated report, watch every proposed seed in full, record approval, and validate complete two-video mappings before a seed or deployment.

## Release closeout

Release only a reviewed main commit. Confirm preview, production, runtime logs, public URL, GitHub main, local main, and deployed commit independently. Remove completed worktrees and preserve only the newest verified QA evidence.
