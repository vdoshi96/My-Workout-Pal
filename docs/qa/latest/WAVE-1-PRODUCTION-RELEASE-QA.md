# Wave 1 production release QA

## Result

Wave 1 is released. GitHub and local `main`, the Vercel production Git source,
and the verified application source all resolve to
`a202a815ad3b7320bbc68b819303822ca4773b1d`. Production migrations `0006` and
`0007` were applied in that order by the schema-owner role after the private
archive passed an isolated restore rehearsal. Hosted public, password, Google,
owner-isolation, media, zoom, and Wave 1 member-flow checks passed. Disposable
identities and owned rows were removed without changing the one baseline Google
identity or the retained deletion audits.

No application rollback or database restore was required. The release did not
seed the 216 candidate guidance links, change an identity provider, change a
Vercel alias, or publish recovery contents.

## Exact release identity

| Role | Exact value |
| --- | --- |
| Application and `main` commit | `a202a815ad3b7320bbc68b819303822ca4773b1d` |
| Application tree | `2f79527b017391aa7a49d2c48b96dd2e169ba784` |
| Previous `main` baseline | `4622f9e1b7783fd35cb6c23ae9396148c7c3357a` |
| Production deployment | `dpl_8Crg9j6UD9K3aH7r6icePmcvLzzH` |
| Deployment URL | `my-workout-cpefx8dfc-vdoshi96s-projects.vercel.app` |
| Vercel project | `vdoshi96s-projects/my-workout-pal`, `prj_aHNqBtTx1irlbhNNvHTvynQkb0P9` |
| Firebase project | `my-workout-pal-92819` |
| Neon database and owner | `neondb`, `neondb_owner` |
| `0006` SHA-256 | `e20555d7abccee6c620054bc62257b38dbaba2739ca5305e8daf6ca064eb56f5` |
| `0007` SHA-256 | `59dce2363f73c2c2a53ef9b4668d1ce57dbf575a8ef0759094ccb4c50eaea4e0` |

Vercel's authenticated deployment record reports Ready production source
`a202a815ad3b7320bbc68b819303822ca4773b1d` from GitHub branch `main`, Node.js
24.x, and region `iad1`. The existing aliases remain exactly:

- `my-workout-pal-chi.vercel.app`
- `my-workout-pal-vdoshi96s-projects.vercel.app`
- `my-workout-pal-git-main-vdoshi96s-projects.vercel.app`

The deployment-specific hostname retains the project's Vercel SSO protection;
the three production aliases are the public hosted-verification surface.

## Source provenance

The released candidate descends from exact baseline
`4622f9e1b7783fd35cb6c23ae9396148c7c3357a` and contains these reviewed source
tips in order:

| Source lane | Exact tip |
| --- | --- |
| Flexible day builder | `af43c950991de499b8e32a6fac5d58f19be44eed` |
| Library and personal guidance | `b54801b28d40eb106f38fea44ac1da71d468b199` |
| Personal Home and companion copy | `b1722b0e9bd1c0e5185f5bc40856667266c44d22` |

Day-chooser checkpoint `2436bac92ba3381e76646bf61210cd5fd4dae88f`
and parallel library checkpoint
`5255a5254fcde4c1b1558947bda64d47bad23743` retain stable patch ID
`33d2fbaf150856a6f0fa146b154bff6cc2d55cde` and the same four blobs. Integration
implementation checkpoint `000a038a9add854dfe59ad796f7b11033753e0d7`
closes the shared contracts; documentation checkpoint
`ae44979880105d02771503637b8a2fa151e9bd05` precedes exact release candidate
`a202a815ad3b7320bbc68b819303822ca4773b1d`. Remote provenance branches remain
available after local source-worktree cleanup.

## Recovery point

The release created this private PostgreSQL custom-format archive over the
configured unpooled TLS connection before either migration:

| Property | Result |
| --- | --- |
| Private path | `/Users/vishal/Library/Application Support/My Workout Pal/Backups/mwp-wave1-pre-0006-20260829T1735Z.dump` |
| Mode | `600` |
| Owner | `vishal:staff` |
| Size | 192,829 bytes |
| SHA-256 | `adcf511735677700332bb3afd884151f360a2da276c537f3e7ebf7fcf92b6ac5` |
| Archive entries | 320 |
| Restore rehearsal | Passed in an isolated disposable PostgreSQL database |

The archive was produced by PostgreSQL 18.6 tooling. The local PostgreSQL 16.15
restore target does not recognize PostgreSQL 18's `transaction_timeout`
setting, so the rehearsal removed only that one `SET` line from a private
temporary SQL stream. Schema and data statements were unchanged. The restored
database reproduced all six pre-Wave-1 migration identities, 35 public tables,
140 public indexes, validated constraints, enabled application triggers,
starter aggregates, zero owned rows, 57 retained deletion audits, and one
projection checkpoint. The disposable database, cluster, socket, log, and SQL
stream were removed; the archive checksum remained unchanged.

## Ordered migration record

Read-only invariants were repeated immediately before the first schema write.
Migration `0006_program_cardio_display_order.sql` then ran in one explicit
schema-owner transaction and recorded migration ID 7 at journal timestamp
`1787892956681`. Verification proved the deterministic backfill, non-null
one-to-two order, owner/revision/day/order uniqueness, validated check, expected
ownership, and enabled `program_cardio_prescriptions_immutable_after_publish`
trigger with state `O`.

The first `0007` transaction was deliberately rolled back when the verification
gate compared long foreign-key names without accounting for PostgreSQL's
identifier-length truncation. Post-rollback checks proved seven migration
records, no `0007` schema objects or data, and every `0006` invariant intact.
The unchanged exact `0007_personal_guidance.sql` was then applied in a new
schema-owner transaction with structural foreign-key checks. It recorded
migration ID 9 at journal timestamp `1787894772216`; the absent ID 8 reflects
the rolled-back transaction's non-transactional sequence allocation, not a
missing migration.

Final verification proved the personal-guidance enum and table, bounded source
XOR and URL/order checks, owner-scoped foreign keys, partial uniqueness and read
indexes, non-null bounded workout guidance snapshots, expected ownership, zero
legacy custom-video rows to migrate, and preservation of all `0006` invariants.
The exact final migration records are:

| ID | Journal timestamp | SHA-256 |
| --- | --- | --- |
| 7 | `1787892956681` | `e20555d7abccee6c620054bc62257b38dbaba2739ca5305e8daf6ca064eb56f5` |
| 9 | `1787894772216` | `59dce2363f73c2c2a53ef9b4668d1ce57dbf575a8ef0759094ccb4c50eaea4e0` |

The final production schema has 36 public tables and 148 public indexes, zero
invalid constraints, zero disabled user triggers, and the cardio immutability
trigger enabled with state `O`. Rollback remains restore-gated because neither
migration has a checked-in down path.

## Main and deployment

Public `main` advanced normally from the exact baseline to the exact candidate
without a merge commit or replacement tree. `origin/main`, local `main`, and
the primary checkout now resolve to the identical application commit. The
primary checkout was clean before the fast-forward and was restored to clean
after generated browser evidence was extracted.

Vercel built the Git-connected production deployment only after both migration
gates passed. The Ready deployment kept the existing project, region, runtime,
providers, environment scopes, and three aliases. Stable production responses
retain private no-store rendering, strict CSP, HSTS, frame denial,
`nosniff`, referrer policy, permissions policy, and the expected popup-compatible
cross-origin opener policy. Maintained `/sw.js` returns JavaScript with
revalidation caching. Browser navigation from `/sample-progress` reaches
canonical `/progress` through the maintained permanent redirect.

## Verification totals

| Gate | Result |
| --- | --- |
| Exact-candidate `pnpm verify` | Passed: TypeScript, ESLint, 118 Vitest files/814 tests, 4 database files/34 tests, Drizzle, exact-two approved-video seed, PWA, 50-document parity, production build, and 44-route boundary |
| Hosted public matrix | 47 passed, one documented Chromium-only service-worker/offline skip in WebKit |
| Authenticated fixture matrix | 38 runnable cases passed, two intentional engine-scoped skips |
| WebKit follow-up | One full-run RSC access-control console entry did not recur in the exact focused WebKit-desktop replay |
| Hosted password lifecycle | Passed verification/recovery action codes, secure session, revocation denial, three intended session mutations, and cleanup |
| Hosted deletion and IDOR | Passed 12 intended first-party mutations, four foreign/missing probes, unchanged global counts, and cleanup |
| Hosted media and native zoom | Passed both videos, first-embed fallback, exact native Chrome 200% zoom and restore, three intended mutations, and cleanup |
| Hosted Wave 1 member flow | Passed the complete disposable-owner editor, runner, history, Home, Progress, snapshot, conflict, and equipment-revision story with cleanup |
| Real Google provider | Passed safe `/app` return, visible verified identity, visible example/blank choices, token revocation redirect, reauthentication, and sign-out |

The authenticated matrix's first aggregate produced 37 passes, two expected
skips, and one WebKit-desktop console assertion for a cancelled RSC request. The
exact failed case passed unchanged on immediate focused replay, so all 38 unique
runnable cases have a passing result. No product source changed for the replay.

## Hosted Wave 1 behavior

The production member replay used a generated verified password identity and
proved:

- blank onboarding, idempotent replay, and conflict on mismatched reuse;
- add, duplicate, reorder, and remove day operations;
- the real editor chooser for seed-day, catalog replace, and catalog add;
- inline private movement creation;
- private guidance HTTP rejection, accepted HTTPS creation, replacement after
  workout start, and immutable pre-replacement snapshot preservation;
- zero-, one-, and two-cardio editor states plus authored Runner-before-Walker
  order in the UI and database;
- publication, reload, exact saved-day start, and the published revision;
- no-data, resumable, and completed personal Home states;
- alternate-day conflict while a workout was resumable;
- complete workout history and owned Progress projection;
- equipment revision without rewriting the completed session's program or
  guidance snapshots.

The separate hosted owner-isolation suite exercised missing and cross-owner
resources without disclosing ownership. Password and Google session checks
proved bounded return, visible verification state, sign-out, and revocation.
No onboarding mutation was submitted under the baseline Google identity.

## Final data and provider reconciliation

Production began with zero profiles, preferences, equipment profiles, custom
content, guidance, programs, revisions, days, sections, prescriptions, cardio
prescriptions, workout sessions, workout snapshots/states, set/cardio logs,
idempotency rows, records, or progress rows. It ended with those same aggregates
at zero.

Firebase began and ended with one enabled baseline Google identity. Final Admin
enumeration found zero `example.invalid` disposable identities and provider set
`google.com`. PostgreSQL retains 27 catalog exercises, 54 already-approved
videos, and one personal-record projection checkpoint. The retained deletion
audit count increased from 57 to 70 because each disposable deletion remains an
intentional terminal audit; all 70 are completed and none are nonterminal. The
216 candidate guidance links remain unseeded and `personal_guidance_links`
contains zero rows.

## Runtime and security logs

A bounded six-hour exact-deployment query inspected up to 1,000 recent request
records and a separate untruncated error-level result set. There were no 5xx
responses. The error-level set contained one status-200
`/app/program/edit` destination-stream cancellation produced when browser QA
navigated away from a streamed response. It was not a failed response and did
not recur as a product assertion. The error set contained no Neon, WebSocket,
idle-connection, or CSRF failure recurrence. Expected `/api/auth/csrf` request
traffic was present during hosted mutations.

## Evidence and cleanup

This report and its generated HTML counterpart are the canonical production
record. The retained screenshots are:

- `hosted-auth-unverified-desktop.png`
- `hosted-auth-verified-desktop.png`
- `hosted-deletion-public-return-desktop.png`
- `hosted-deletion-review-desktop.png`
- `hosted-wave1-editor-desktop.png`
- `hosted-wave1-runner-desktop.png`

Superseded Wave 1 integration reports and screenshots were removed after this
package passed parity. The clean completed day-builder, library-guidance,
companion-home, and integration worktrees were removed, and their four local
branches were deleted only after proving their commits were ancestors of
`main`. Remote provenance branches remain unchanged.

The current `vishal/wave-1-production-release` worktree remains only to retain
and push this documentation without triggering a replacement application
deployment from `main`. Local branch `vishal/pre-wave1-primary-preservation`
remains unresolved because it contains one unique pre-sync documentation commit;
it has no active worktree. No other Wave 1 source worktree remains.

## Remaining limitations

- The recovery archive is private and restore-tested, but a production restore
  was neither necessary nor attempted.
- The deployment-specific hostname is Vercel-SSO protected; exact Git-source
  identity comes from the authenticated deployment record, while hosted product
  verification ran on the stable public alias.
- Password verification and recovery used Firebase-generated action codes and
  did not claim inbox delivery.
- The documentation closeout stays on
  `vishal/wave-1-production-release`; merging it to `main` would create an
  unnecessary replacement application deployment. Production remains on exact
  application SHA `a202a815ad3b7320bbc68b819303822ca4773b1d`.
