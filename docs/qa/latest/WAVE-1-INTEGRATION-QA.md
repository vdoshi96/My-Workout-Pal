# Wave 1 integration QA

## Status

`vishal/wave-1-integration` is a clean, locally verified Wave 1 candidate. It preserves the three exact source tips, closes the two intentionally deferred integration seams, and stops before public-`main` merge, production migration, guidance-candidate seeding, deployment, alias/provider work, or sibling-worktree removal. The implementation checkpoint is `000a038a9add854dfe59ad796f7b11033753e0d7`; the final documentation-only branch tip is reported from the live remote ref at handoff.

## Candidate identity and provenance

| Role | Commit |
| --- | --- |
| Verified clean base | `4622f9e1b7783fd35cb6c23ae9396148c7c3357a` |
| Flexible day builder source | `af43c950991de499b8e32a6fac5d58f19be44eed` |
| Library and personal guidance source | `b54801b28d40eb106f38fea44ac1da71d468b199` |
| Personal home and companion copy source | `b1722b0e9bd1c0e5185f5bc40856667266c44d22` |
| Integration plan | `037a6cb48ed49d5e95b2161d9513e2c81ae44645` |
| Day merge | `880c54b4b3ebc3dcaa8500be9cdf35b3bcec0486` |
| Library merge | `258758839aebd3c10d610c809f7e0e70231fd2b3` |
| Home/copy merge | `ef6f806c683e1b2c1e3bf6c721fe1ce49f3f7bce` |
| Integration implementation | `000a038a9add854dfe59ad796f7b11033753e0d7` |
| Documentation and retained QA evidence | `ae44979880105d02771503637b8a2fa151e9bd05` |

The worktree began clean with detached `HEAD`, local `main`, and `origin/main` at the required base. Live `git rev-parse refs/remotes/origin/<branch>` returned each source SHA above. `git merge-base --is-ancestor BASE TIP` and `git merge-base --is-ancestor TIP HEAD` passed for all three sources. `git diff --check BASE..HEAD` and the final worktree diff check passed.

The day-builder history is `0465b9a` → `2436bac` → `af43c95`; the library history is `5255a52` → `0f82053` → `074cf0c` → `b54801b`; home/copy is a direct child of the base. Day chooser checkpoint `2436bac92ba3381e76646bf61210cd5fd4dae88f` and library checkpoint `5255a5254fcde4c1b1558947bda64d47bad23743` both produce stable patch ID `33d2fbaf150856a6f0fa146b154bff6cc2d55cde`. Their Markdown plan, generated HTML, contract module, and contract-test blobs are identical. Integration therefore retains the day checkpoint as the first history and records the library checkpoint as parallel provenance, with one production contract/module/test implementation.

Reproducible provenance commands:

```sh
git rev-parse refs/remotes/origin/<branch>
git merge-base --is-ancestor 4622f9e1b7783fd35cb6c23ae9396148c7c3357a <tip>
git show --format=raw <commit>
git show <tip>^..<tip> | git patch-id --stable
```

## Failed-before integration evidence

These are integration-created conflicts and gaps, not source-worker failures.

### Merge conflicts

`git merge-tree --write-tree 880c54b b54801b` reproduced the library merge conflicts in:

- `docs/context/DECISIONS.md` and generated `.html`
- `docs/context/STATUS.md` and generated `.html`
- `docs/plans/LIBRARY-AND-PERSONAL-GUIDANCE.md` and generated `.html` as add/add
- `docs/wiki/index.md` and generated `.html`
- `drizzle/meta/_journal.json`
- `tests/fixtures/authenticated-app/server/database.ts`
- `tests/integration/account-deletion-reconciliation-repository.test.ts`
- `tests/integration/account-deletion-repository.test.ts`
- `tests/integration/training-insights-repository.test.ts`
- `tests/integration/workout-repository.test.ts`

`git merge-tree --write-tree 2587588 b1722b0` reproduced the home/copy conflicts in generated `DECISIONS.html`, `STATUS.md`/`.html`, and wiki Markdown/HTML. Day merged first without a textual conflict. Successful auto-merges in `globals.css`, `schema.ts`, `workout-repository.ts`, the flexible authenticated journey, and workout tests still received semantic review.

Resolution kept Markdown canonical and regenerated HTML; retained both append-only decisions and all three plans; combined `0006` then `0007` in every fixture; and kept the union of cardio order/default/reset behavior, guidance snapshot/owner isolation, and `findResumable` home reads. No conflict was resolved by choosing one branch's migration list or one branch's repository test.

### Migration metadata gap

The library branch's `0007_snapshot.json` was generated directly from `0005`. It omitted `program_cardio_prescriptions.display_order`, `program_cardio_prescriptions_order_unique`, and `program_cardio_display_order_shape`. The integrated snapshot was regenerated from the exact `0006` snapshot, and the journal was reconciled to sequential entries with `0006` at timestamp `1787892956681` and `0007` at `1787894772216`.

A focused SQL regression also showed PostgreSQL accepting a YouTube guidance row with a null video ID because CHECK expressions accept null. The corrected schema and migration require `youtube_video_id is not null` before matching the 11-character pattern; the focused repository replay passes.

### Intentionally deferred product seams

The source branches deliberately left two responsibilities for integration:

1. New-account setup offered only the example. A focused four-file run produced five expected failures for the absent request/response mode, blank graph, replay mismatch, and editor adapter boundary. Integration extended the existing owner-scoped onboarding transaction with `mode: "example" | "blank"`, included mode in the idempotency hash and strict response, and created a minimal valid blank graph without a hidden starter or second API path. The focused replay passed 46/46 tests.
2. The intact day editor still rendered its local static chooser. The editor now mounts `MovementChooserAdapter` for add, replace, and seed-day; its duplicate dialog/CSS is retired. A new model test first failed because a just-created private source was absent from initial candidates, then passed after adding an editor-local `MovementSelection` hint map. The hint controls display/default recognition only; server publication remains authoritative. The focused model replay passed 18/18.

The combined focused migration/product replay passed 8 files and 65 tests.

### Environment and browser-attempt distinctions

- A pnpm wrapper attempt never reached `docs:check`: the package-manager bootstrap tried to replace shared `node_modules`, hit `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`, and could not fetch pnpm metadata. No dependency directory was purged, reinstalled, or chmodded. The canonical direct documentation generator/checker is the product result.
- An earlier direct Vitest attempt did not collect tests because Vite could not create its shared `.vite-temp` config file (`EPERM`). The established `--configLoader runner` path collected normally.
- The first complete Vitest replay reached 813/814 assertions; the remaining loopback probe stopped before its assertion at sandbox-denied `listen EPERM 127.0.0.1`. The permission-correct full replay passed 118 files and 814 tests.
- The first new inline-private browser assertion expected repository-level `30–60` duration defaults. The rendered editor correctly preserved the day-builder's established `20–45` defaults; the test expectation was corrected and both browsers passed.
- WebKit reached the final cross-owner editor check but an immediate navigation raced the onboarding refresh. Waiting for the ready-state heading removed the harness race; the complete journey then passed.
- The first credential-free public run passed 39, skipped the known WebKit service-worker case, and failed eight exercise-detail cases because the server lacked `DATABASE_URL`. No product assertion on those routes ran. A temporary local Postgres cluster, the repository's loopback Neon adapter, migrations `0000`–`0007`, and only the already-approved starter/video seed produced the final 47-pass/1-skip matrix. The temporary database contained zero personal-guidance rows and was stopped and deleted after the run.

The audit briefly reported an editor blob regression after a malformed zsh ref expression. Correct `git rev-parse <ref>:<path>` checks proved the editor and model blobs still matched the day tip. This was an audit-command correction, not product failed-before evidence.

## Integration record

- Day behavior remains authoritative for stable topology keys, arbitrary day/section/movement/cardio editing, retention/reset rules, reviewed removal, publication, reload, and exact-start snapshots.
- Library behavior remains authoritative for compatible canonical/private loading, bounded search, inline private creation, owner-only guidance, URL safety, and immutable guidance snapshots.
- Home/copy behavior remains authoritative for identity/sign-out, new/ready/active/unverified/loading/error states, dominant resume, review navigation, canonical public Progress, and the permanent sample alias.
- The onboarding API is the single example-or-blank creation boundary. Blank persists profile, equipment, one active custom program, one published revision, Day 1, Main work, and one compatible placeholder movement before routing to `/app/program/edit`.
- The real editor is the single chooser interaction. `/app/library/chooser` exists only in the authenticated test fixture as a library harness; it is absent from the 44-entry production route inventory and is not a second editor persistence path.
- Active sessions suppress competing starts. Direct alternate-day start returns the existing safe conflict and creates no second session; completion or abandonment restores starts.
- No Wave 3 companion art, component, CSS, route, or cache entry entered the candidate.

## Migration and recovery review

| Migration | SHA-256 | Reviewed behavior |
| --- | --- | --- |
| `0006_program_cardio_display_order.sql` | `e20555d7abccee6c620054bc62257b38dbaba2739ca5305e8daf6ca064eb56f5` | Adds nullable order, disables only `program_cardio_prescriptions_immutable_after_publish`, backfills by owner/revision/day with Walker then Runner and ID tie-break, re-enables the trigger, makes order required, and adds owner/revision/day/order uniqueness plus the 1–2 CHECK. |
| `0007_personal_guidance.sql` | `59dce2363f73c2c2a53ef9b4668d1ce57dbf575a8ef0759094ccb4c50eaea4e0` | Adds the guidance enum/table, owner/source XOR, HTTPS and YouTube shape, 1–2 order, owner/custom composite FK, partial order/URL uniqueness, owner/source indexes, legacy custom-video backfill, and bounded `guidance_snapshot`. |
| `0007_snapshot.json` | `1315b533a55802bbb16ab6dfb2db9294fc52dfa0d5c69d879e36728a78ddf5f7` | Snapshot ID `30c8bbd1-d86e-463e-89ac-3586832e4370`, predecessor `732fe07b-adbb-4d41-b3c6-d84fb7c22ee1`, 36 tables, 19 enums, and both migrations' objects. |

Every maintained PGlite chain—authenticated fixture, account deletion and reconciliation, training insights, workout repository, profile/program, program collection, custom exercise, personal guidance, and flexible schema—applies `0006` before `0007`. The full-chain test explicitly observes trigger state `O` after `0007`. A separate temporary local Postgres replay recorded all eight migration hashes/timestamps, 27 catalog exercises, 54 already-approved videos, zero personal-guidance rows, and an enabled cardio immutability trigger.

Both migrations are additive forward migrations with no checked-in down path. Rollback is restore-gated: snapshot/backup and restore rehearsal must precede production work. Deploy ordering is strict: apply and verify `0006`, then apply and verify `0007`, then deploy code that reads either new shape. A failed migration or invariant check stops the release; application rollback does not make the old schema destructive.

## Static, data, and build verification

| Gate | Result |
| --- | --- |
| TypeScript | Passed: `tsc --noEmit` |
| ESLint | Passed: full `eslint .` |
| Vitest | Passed: 118 files, 814 tests |
| Focused Wave 1 seam replay | Passed: 8 files, 65 tests |
| Drizzle | Passed: `drizzle-kit check` |
| Schema/bootstrap and full migration chains | Passed in the full suite and temporary local Postgres `0000`–`0007` replay |
| Deterministic exact-two seed | Passed: 27 required variations, exactly two approved videos each |
| PWA/service worker | Passed: generated service worker verified |
| Documentation | Passed: canonical generator/checker verifies 50 Markdown/HTML pairs |
| Diff hygiene | Passed: base-to-candidate and final worktree `git diff --check` |
| Production build | Passed: Next.js 16.3.2 Webpack build |
| Production route boundary | Passed: 44 App Router entries; authenticated harness-only chooser absent |

## Browser verification

The complete authenticated production-fixture matrix passed 38 tests with two intentional engine-scoped skips in 3.6 minutes. The final post-cleanup replay repeated the same 38-pass/two-skip result. Journey coverage ran in Chromium desktop and WebKit phone; responsive geometry also ran in Chromium phone/tablet and WebKit tablet/desktop.

| Contract | Chromium desktop | WebKit phone |
| --- | --- | --- |
| Example and blank exactly-one creation, replay, mode mismatch | Passed | Passed |
| Arbitrary topology, movement/section/cardio add/reorder/removal | Passed | Passed |
| Canonical add/replace/seed-day through the real adapter | Passed | Passed |
| Inline private creation, correct duration UI/defaults, publish/reload | Passed | Passed |
| Personal guidance replace and immutable workout/history snapshot | Passed | Passed |
| Zero/one/two-cardio behavior and authored order | Passed | Passed |
| Exact start, alternate-day resume conflict, terminal recovery | Passed | Passed |
| Equipment revision and historical immutability | Passed | Passed; one separate incompatible-movement case intentionally engine-scoped |
| New, ready, active, unverified, empty, loading, and error Home | Passed | Passed |
| Cross-owner missing-equivalent failures and no private leakage | Passed | Passed |

The maintained public production matrix passed 47 tests with the documented WebKit service-worker capability skip. The final post-cleanup replay against a newly created disposable local PostgreSQL database repeated the same 47-pass/one-skip result, after which the database and its local proxy were stopped and removed. The matrix verifies the identity-neutral shell, `/progress`, permanent `/sample-progress` redirect, exactly one sample disclosure, protected account entry and safe sign-in return, public exercise/library routes, keyboard/targets/dark/reduced-motion/overflow, Axe results, and Chromium offline recovery. Authenticated coverage separately proves `/app/progress` is owned data, not the sample preview. Generated service-worker tests prove `/progress` is cached while `/app/progress`, private routes, APIs, and the alias are excluded.

A final bounded evidence replay after implementation passed the complete flexible routine and personal Home/cross-owner cases in both target browsers: 4/4.

## Retained evidence

`docs/qa/latest/` contains only this report, generated HTML, and the newest combined synthetic screenshots:

- `COMPANION-LANDING-CHROMIUM-DESKTOP.png`
- `PERSONAL-HOME-ACTIVE-CHROMIUM-DESKTOP.png`
- `PERSONAL-HOME-UNVERIFIED-320-WEBKIT.png`
- `firebase-client-auth-missing-chromium-desktop.png`
- `firebase-client-auth-missing-webkit-phone.png`
- `flexible-day-builder-editor-chromium-desktop.png`
- `flexible-day-builder-saved-day-webkit-phone.png`
- `flexible-day-builder-runner-chromium-desktop.png`
- `flexible-routine-history-chromium-desktop.png`
- `library-guidance-chromium-desktop.png`
- `library-guidance-runner-webkit-phone.png`

Worker-specific reports remain recoverable from their exact branch commits and were removed from `latest` after the combined replacements passed.

## Boundaries and known limitations

- This is local synthetic evidence, not hosted or production proof.
- No production database was read or written. The public exercise-detail matrix used a temporary local Postgres database, and that database was deleted after verification.
- No one of the 216 product-selected expansion links was inserted into runtime guidance or marked approved. Full-watch curation remains separately required.
- No production migration, deployment, alias/provider mutation, `main` merge, or sibling-worktree cleanup occurred.
- Migrations `0006` and `0007` require backup/restore readiness because there is no automatic down migration.
- The pnpm aggregate wrapper remains unusable in this shared worktree without risking dependency replacement; each underlying canonical gate passed directly.

## Production release sequence after separate authorization

1. Review the pushed candidate SHA and its diff from `4622f9e1`; authorize a merge commit into `main` separately.
2. Confirm production backup, checksum, restore rehearsal, maintenance window, schema owner, and rollback decision point. Stop if restore readiness is incomplete.
3. Apply `0006_program_cardio_display_order.sql` only. Verify deterministic backfill, non-null/order constraints, owner/revision/day uniqueness, and `program_cardio_prescriptions_immutable_after_publish` enabled.
4. Apply `0007_personal_guidance.sql` only. Verify legacy guidance counts, owner/source XOR and composite ownership, URL/order constraints, indexes, and bounded workout guidance snapshots. Do not seed the 216 guidance candidates.
5. Run production schema/bootstrap/read-only invariant checks. If any check fails, stop and restore according to the reviewed recovery plan; do not deploy application code.
6. Merge the reviewed candidate into `main`, build the exact main artifact, and deploy only after both schemas are verified.
7. Replay public routes, auth/verification, example and blank setup, editor/chooser/private guidance, publish/start/resume/history/equipment, Progress/redirect, owner isolation, PWA, and error logs against the exact deployment.
8. Change production aliases or providers only under explicit separate authorization. Candidate-link curation, full-watch approval, and any later seed are separate releases.
