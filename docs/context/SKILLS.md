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

Run the resumable curation command only with an official YouTube Data API v3 key. Review only targets marked `ready-for-review`. Watch every proposed seed from start to finish, record the visual and audio decision, and validate complete two-video mappings before a seed or deployment.

Record an interrupted or evidence-blocked review without approval:

```bash
pnpm youtube:review -- --target EXERCISE_SLUG --variation canonical --video VIDEO_ID --decision pending --reviewer REVIEWER_NAME --playback-completed-at REVIEW_TIMESTAMP --blocker-reason visual-evidence-unavailable
```

Record an approval only after the reviewer observed the complete visual and audio instruction:

```bash
pnpm youtube:review -- --target EXERCISE_SLUG --variation canonical --video VIDEO_ID --decision approved --reviewer REVIEWER_NAME --playback-completed-at REVIEW_TIMESTAMP --full-watch-confirmed --visual-review-confirmed --audio-review-confirmed --exact-variation --concise-instruction --safe-instruction --adds-material-value
```

The command writes only `.local/youtube-curation/manual-reviews.json`, validates that the scoped candidate exists, and refuses to weaken an approval without `--replace-approved`. Don't commit the ignored review file, API key, raw media, screenshots, or transcripts.

## Release closeout

Release only a reviewed main commit. Confirm preview, production, runtime logs, public URL, GitHub main, local main, and deployed commit independently. Remove completed worktrees and preserve only the newest verified QA evidence.
