# Wave 1 integration QA

## Status

Integration verification is in progress. This report records only evidence observed on `vishal/wave-1-integration`; it does not treat isolated worker results as combined proof.

## Candidate identity

- Base: `4622f9e1b7783fd35cb6c23ae9396148c7c3357a`
- Flexible day builder: `af43c950991de499b8e32a6fac5d58f19be44eed`
- Library and personal guidance: `b54801b28d40eb106f38fea44ac1da71d468b199`
- Personal home and companion copy: `b1722b0e9bd1c0e5185f5bc40856667266c44d22`
- Candidate branch: `vishal/wave-1-integration`
- Candidate commit: Pending

## Baseline and provenance

Before branch creation, detached `HEAD`, local `main`, `origin/main`, and the merge base all resolved to the required base, and the worktree was clean. A read-only GitHub remote-head query confirmed all three source tips.

Chooser checkpoint `2436bac92ba3381e76646bf61210cd5fd4dae88f` is an ancestor of the day-builder tip. Library checkpoint `5255a525` is an ancestor of the library tip. Their two documentation files, contract module, and contract test resolve to four matching Git blob IDs, proving byte identity before integration.

## Failed-before integration evidence

Pending the first combined merge, schema, and product runs. Record only integration-created conflicts or gaps here; don't duplicate worker feature failures.

## Integration record

Pending.

## Migration review

Pending review of `0006_program_cardio_display_order.sql`, `0007_personal_guidance.sql`, the integrated `0007_snapshot.json`, journal order, local PGlite chain, fixtures, and schema/bootstrap assertions.

## Static and data verification

| Gate | Result | Evidence |
| --- | --- | --- |
| TypeScript | Pending | Pending |
| ESLint | Pending | Pending |
| Vitest | Pending | Pending |
| Drizzle and schema | Pending | Pending |
| PGlite `0000`-`0007` | Pending | Pending |
| Deterministic seed and exact-two | Pending | Pending |
| PWA/service worker | Pending | Pending |
| Documentation | Pending | Pending |
| Diff check | Pending | Pending |
| Webpack production build | Pending | Pending |
| Route boundary | Pending | Pending |

## Browser verification

| Journey | Chromium desktop | WebKit phone |
| --- | --- | --- |
| Example and blank creation | Pending | Pending |
| Arbitrary editor and chooser operations | Pending | Pending |
| Inline private creation and personal guidance | Pending | Pending |
| Publish, reload, exact start, and cardio order | Pending | Pending |
| Resume conflict and immutable history | Pending | Pending |
| Equipment revision | Pending | Pending |
| Home, unverified, and cross-owner states | Pending | Pending |
| Public Progress and redirect | Pending | Pending |

The maintained public browser matrix is pending. Retained screenshot inventory is pending.

## Boundaries and limitations

No production migration, data seed, deployment, alias/provider change, `main` merge, or sibling-worktree removal is part of this QA run. Local verification can't prove a future production release.

## Release sequence after separate authorization

Pending final candidate identity and reviewed migration gate. The release sequence will remain documentation-only until the user gives separate release authorization.
