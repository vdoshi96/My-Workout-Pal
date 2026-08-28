# Library and personal guidance QA

## Outcome

Wave 1's library-owned slice is complete on
`vishal/library-guidance-foundation` and remains unmerged and undeployed. An
authenticated owner can browse compatible canonical and private movements,
create a private movement inline, save or replace private guidance, receive the
exact frozen chooser selection, publish through the existing owner-scoped
server boundary, start a workout, and retain the original private guidance after
the live link changes.

The library branch does not edit the day-builder shell. Central integration must
merge day-builder source `af43c950991de499b8e32a6fac5d58f19be44eed`, then
this branch, retain migrations `0006` and `0007` in order, and reconcile the
`0007` Drizzle snapshot metadata with the integrated `0006` snapshot.

## Contract and catalog checkpoints

- Chooser checkpoint: `5255a5254fcde4c1b1558947bda64d47bad23743`.
- Exact day-builder handshake: `2436bac92ba3381e76646bf61210cd5fd4dae88f`.
- Relationship: parallel commits from the same Wave 0 baseline with identical
  contract, test, Markdown, and HTML blobs.
- Catalog checkpoint: `0f820535c4aec0686b7b73451513bc8d3dda7d26`.
- Catalog result: 27 released movements, eight category manifests, released
  order and seed identity preserved, and no expansion candidate seeded.

## Failed-before evidence

- The personal-guidance repository test initially failed because its module did
  not exist.
- The legacy-guidance migration regression failed with zero copied rows before
  `0007` backfilled existing custom-exercise YouTube links.
- The snapshot regression proved the repository contained the saved link but
  resume hydration returned `undefined` before the hydrator preserved guidance.
- The first browser replay exposed a same-selection state reset that remained on
  “Loading your private guidance…”; the corrected activation preserves already
  loaded detail state.
- The accessibility replay reported one serious header eyebrow contrast issue
  at 2.06:1; the corrected token combination passes the axe scan in both
  projects.

## Automated verification

The permission-correct branch-wide `pnpm verify` gate passed:

- Strict TypeScript and full ESLint.
- 116 Vitest files and 796 tests.
- Drizzle metadata plus four schema/bootstrap files and 34 tests.
- Exact-two approved starter-video seed verification.
- Generated service-worker verification.
- 47 Markdown/HTML documentation pairs.
- Next.js 16.3.2 Webpack production build.
- 43-entry production App Router boundary with no fixture route.

The focused matrix covers URL rejection and normalization, schema and repository
ownership, idempotency, API authentication order, custom deletion, account
deletion, chooser response parsing and filtering, safe personal presentation,
workout snapshot immutability, and resume hydration. The initial sandboxed full
run's localhost-probe `EPERM` was an execution-permission failure; the
permission-correct complete replay passed all 796 tests.

No external URL was fetched by the application during personal-link validation.
The 216 product-selected expansion links remain candidates and were neither
seeded nor labeled as approved guidance.

## Authenticated browser verification

The isolated production-mode fixture ran one synthetic Alice/Bob scope per
project and passed in Chromium desktop and WebKit phone. Each browser completed:

1. Onboarding and compatible catalog search.
2. Private-source filtering and its empty state.
3. Inline creation of `Suitcase march` with a YouTube short URL.
4. Exact custom-source chooser selection without editor topology data.
5. Reload and canonical YouTube URL recovery.
6. Replacement with a safe external article and private save confirmation.
7. Publication of the selected movement through the server-owned routine
   contract and workout start.
8. Runner rendering as **Your links**, with the explicit not-reviewed notice.
9. Live guidance replacement followed by runner reload that retained the
   original immutable snapshot URL.
10. A synthetic Bob read of Alice's private movement guidance returning the
    same `404` as a missing resource.
11. Zero unexpected console/page/request failures and zero critical or serious
    axe violations on the chooser state.

Evidence:

- `library-guidance-chromium-desktop.png`
- `library-guidance-webkit-phone.png`
- `library-guidance-runner-chromium-desktop.png`
- `library-guidance-runner-webkit-phone.png`

These screenshots contain synthetic fixture data only. They are local evidence,
not production proof.

## Release boundary

No merge into `main`, production migration, seed mutation, deployment, alias,
private source artifact, or other worktree change occurred. The schema owner
must restore-gate and apply migrations during centralized integration. Runtime
video publication remains subject to the existing per-video full-watch rule.
