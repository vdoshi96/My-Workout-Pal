# Wave 2 production release QA

## Outcome

Wave 2 is released. Exact application candidate
`0ad06ef3821975d689015644be96f94f6b3b2dfa` is on public `main` and was served
by Ready production deployment `dpl_DYxcb4ennqnstt8sFR2dkLXnomkn` on the three
existing production aliases. The release added only the authorized global
catalog graph: 107 exercises, 158 compatibility edges, and 215 aliases. It did
not apply a migration, change a provider or alias, approve a video, publish a
candidate URL, or create persistent owner data.

The production release passed durable recovery, deterministic seed and replay,
direct database invariants, hosted public and signed-in Wave 2 journeys,
ordinary real Google authentication, owner isolation, exact cleanup, PWA,
accessibility, and exact-deployment log checks. The private recovery archive and
remote provenance branches remain preserved.

## Exact identities and attribution

| Boundary | Verified identity |
| --- | --- |
| Wave 1 base | `a202a815ad3b7320bbc68b819303822ca4773b1d` |
| Fully verified Wave 2 application/content | `301b618b888613d95d69dffc5c42b6fb0dd26797` |
| Released application candidate | `0ad06ef3821975d689015644be96f94f6b3b2dfa` |
| Application deployment | `dpl_DYxcb4ennqnstt8sFR2dkLXnomkn` |
| Exact deployment source/state | `0ad06ef`; production; `READY` |
| Exact deployment URL | `https://my-workout-jup04bi3o-vdoshi96s-projects.vercel.app` |
| Existing aliases | `my-workout-pal-chi.vercel.app`; `my-workout-pal-vdoshi96s-projects.vercel.app`; `my-workout-pal-git-main-vdoshi96s-projects.vercel.app` |
| Documentation evidence commit | Recorded in the final release handoff after this report is committed |

The complete `301b618..0ad06ef` change is documentation-only: 14 Markdown and
generated HTML paths, with no runtime, test, schema, migration, seed, script, or
public-asset difference. The 122-file/834-test application matrix, 34 database
tests, TypeScript, ESLint, Drizzle, seed, PWA, build, 44-route boundary, 42-pass
authenticated matrix with two intentional skips, and 47-pass public matrix
with one documented WebKit skip belong to `301b618`. Proportional documentation
and tree-equivalence checks belong to `0ad06ef`. Hosted evidence in this report
belongs only to deployment `dpl_DYxcb4ennqnstt8sFR2dkLXnomkn` at source
`0ad06ef`.

## Recovery proof

Before the seed, PostgreSQL 18.6 client tooling created a private custom-format
archive outside the repository:

`/Users/vishal/Library/Application Support/My Workout Pal/Backups/mwp-wave2-preseed-2026-08-29-0ad06ef.dump`

The archive and adjacent checksum are mode `600`; their containing directory is
mode `700`. The archive is 201,206 bytes and its SHA-256 is
`d196af1c16afe661774ca5e758e1d6e9123065a066411bde3cb0c7639c58364e`.
`pg_restore --list` read 334 entries. An isolated disposable database accepted
a single-transaction restore with restore-only `--no-owner --no-acl`
normalization. Schema, migration, ownership, constraint, trigger, index,
application-verifier, aggregate, and all-table digest comparisons matched
production. The disposable database was dropped and its absence confirmed.
The archive was not normalized or modified and remains preserved.
The production server reported `18.6 (c5250a2)`, so the archive and restore
rehearsal used matching-major tooling.

## Database release

The preflight found eight migrations through `0007`, 36 public tables, 12 public
functions, 17 enabled user triggers, no invalid constraint or index, no owner
drift, and the expected `pg_database_owner` public-schema proxy. Wave 2 had no
migration to apply.

The existing owner-approved transactional seed ran from exact `0ad06ef` before
the application deployment. The first run changed only the intended global
graph. The second run was an all-table no-op.

| Global group | Before | First seed | Replay | Final |
| --- | ---: | ---: | ---: | ---: |
| Catalog exercises | 27 | 134 | 134 | 134 |
| Compatibility edges | 44 | 202 | 202 | 202 |
| Search aliases | 54 | 269 | 269 | 269 |
| Approved videos | 54 | 54 | 54 | 54 |

The original pre-seed-to-post-seed digest proof retained the approved-video
digest
`20437f1bcc2378578d87f9eaa127b0828acafbcab2a06cdfa833cb0d2c1d77e1`.
No approved-video row changed. Approved-video eligibility remains exactly 27
canonical variations. None of the 216 product-selected research links was
approved, embedded, or seeded.

A separate closeout query projected the exact seed-managed fields and used
JSON-string wrapping before SHA-256. These digests intentionally use a
different serialization from the release-time digests and are not compared to
them:

| Group | Closeout projection digest |
| --- | --- |
| Catalog exercises | `d4cfe89191c1679673ecfa2bcf091e4727919ce4347133c3b9fbd5c4ef7dd676` |
| Compatibility edges | `5f73495e3822848082d7ff9bd15d3908b930ca3aae725ed1cd4e1fa3b9a31e46` |
| Search aliases | `44c87b0aae261047ab3c6817575f3f592076f960bd601db58a7d76e6c3a086ed` |
| Approved videos | `2e3c795e0363d834055d283f2e689b5df26fc2e3ef9d243ff1b3f1c1b51f1524` |

The repository verifier independently passed the exact manifest contract:
134 exercises, 202 compatibility edges, 269 aliases, and 54 approved videos.
The closeout structural query again found zero invalid constraints, zero invalid
indexes, all 17 triggers enabled, and zero table, function, or schema-owner
drift.

## Hosted production verification

| Lane | Chromium desktop | Phone WebKit | Result |
| --- | ---: | ---: | --- |
| Existing public release and PWA | Included in 23 passes | Included; one service-worker capability skip | 23 passed, 1 intentional skip |
| Wave 2 public search/detail supplement | 1 | 1 | 2 passed |
| Disposable signed-in Wave 2 journey | 1 | 1 | 2 passed |
| Ordinary real Google | 1 interactive Chrome lane | Not repeated | Passed |

The existing public suite is released-catalog regression only. The separate
Wave 2 public supplement searched the `farmers walk` alias, opened Dumbbell
farmer carry, verified distance-and-duration meaning, exactly three cues,
truthful `Unavailable` guidance, zero iframes, no candidate URL in DOM or
observed network, no serious or critical app-owned Axe violation, and no
horizontal overflow.

The current-UI signed-in journey used exact disposable verified password
identities. It proved a blank metric routine with new Dumbbell curl, Flutter
kick, and Dumbbell farmer carry movements; the positive-distance blocker;
corrected publish, reload, start, log, complete, and immutable history;
unavailable guidance with zero iframes and no candidate request; app-owned
accessibility; responsive layout; foreign-resource denial; and no client UID
trust. All disposable identities and owned rows were then removed.

Two older checked-in hosted wrappers stopped at their truthful session
boundaries. They are not counted as hosted passes and are not used as Wave 2,
Google, edge-count, or alias-count proof.

### Ordinary real Google

Production **Continue with Google** opened the ordinary Google flow in Chrome
and returned safely to bounded `/app`. No chooser, consent, MFA, CAPTCHA, or
other owner-action boundary appeared. The application showed a generic verified
identity and the app sign-out control. No onboarding choice was submitted; no
profile, program, workout, history, or other application data was created.

After the product owner supplied action-time confirmation, the production app's
**Sign out** control cleared the secure session and app-local workout-draft
namespace. The browser returned to `/sign-in`. A direct `/app` navigation then
returned to `/sign-in?returnTo=/app`, with no verified identity visible. A
privacy-safe direct Firebase/PostgreSQL audit found the single expected
Google-provider identity, no password identities, zero rows for that exact
Google owner in every application table, and zero active owner-scoped
application rows globally. No email, UID, account attribute, cookie, token, or
private identity detail was recorded or retained.

## Cleanup and operational invariants

Final owner/application state is empty. All 83 retained deletion audits are
terminal completed records; this includes the 70-row Wave 1 baseline and 13
Wave 2 QA cleanup attempts. The personal projection checkpoint remains
completed. Real user and global baseline data were not deleted or repaired.

The exact application deployment's bounded logs contained zero errors, zero
warnings, and zero `5xx` responses. A broader 1,000-entry sample contained only
informational middleware and serverless records. No cancellation appeared, so
none was classified as benign.

The clean completed Strength, Core/conditioning, video-eligibility, and Wave 2
integration worktrees and their local branches were removed after exact remote
tip verification. Their remote provenance branches remain. The active release
worktree and its checked-out local release branch remain only because a running
worktree cannot safely remove itself; that exact final cleanup item is reported
to the orchestrator. The durable recovery archive remains outside Git.

## Evidence-retention and release boundaries

This Markdown report and generated HTML counterpart are the only newest Wave 2
QA evidence retained in `docs/qa/latest`. The six synthetic integration
screenshots were removed; no production screenshot is published. No retained
artifact contains an email, raw UID, credential, token, cookie, private account
detail, database connection, private provider URL, or candidate-video URL.

The documentation closeout changes only documentation and generated HTML. Its
Vercel build must be Ready, preserve the three aliases, and have an
application/runtime tree byte-identical to `0ad06ef`; its exact Git and
deployment identities are reported in the immutable final release handoff,
because neither can be self-referenced by the commit that creates this report.
