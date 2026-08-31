# Wave 4 production release QA

## Disposition

Wave 4 is live on the public production aliases from the exact reviewed
application tree. The companion presentation, public cache boundary, password
authentication, two-owner authorization, disposable cleanup, database graph,
and rollback boundary are verified. The documentation closeout contains no
application-runtime change.

Two limitations remain explicit. True native Chrome 200% could not be reached
through the available macOS control bridge, so no emulated zoom result is
substituted. A disposable workout abandoned while every exercise remained
pending produced a usable History row but its detail route logged `Workout
history is incomplete`; the release did not change repository behavior because
Wave 4 is presentation/test/documentation only. The ordinary Google lane is
recorded below at its final action-time disposition.

## Exact identity, deployment, and recovery

| Boundary | Verified identity |
| --- | --- |
| Public base | `298cb04b8b16ad6c3586ef74bc95df7301533472` |
| Reviewed pilot | `b4499f3b953a5745039f1bca67da68e6e135c7c3` |
| Reviewed rollout | `709a977bbccc0333517e873955c0b3572e70bd9f` |
| Integration merge | `d962dfb59a51b7bb0cf57cda19ea611a0ec32fa7` |
| Integration candidate | `5c416d774fb53c3a4f5f5623ef1a202fca4b07ee` |
| Application release commit | `de19b1c89c34235723158ad8858f6b46f4fcde72` |
| Exact candidate preview | `dpl_348br8EQdnW2QJXVEhQhHDrSVY5j`, `READY` |
| Application production | `dpl_7836V51i4HzkkCcaG8Bz6QoZYE6z`, `READY` |
| Application deployment URL | `my-workout-nxkylmkck-vdoshi96s-projects.vercel.app` |
| Application rollback | `dpl_DYxcb4ennqnstt8sFR2dkLXnomkn`, source `0ad06ef3821975d689015644be96f94f6b3b2dfa` |

The automatic Git-connected production deployment reported exact source
`de19b1c`. No preview promotion, redeploy, alias move, provider change,
environment change, billing change, migration, or seed occurred. The alias set
remained:

- `my-workout-pal-chi.vercel.app`
- `my-workout-pal-vdoshi96s-projects.vercel.app`
- `my-workout-pal-git-main-vdoshi96s-projects.vercel.app`

The private Wave 2 recovery archive remains outside the repository, mode 600,
readable by PostgreSQL 18.6 tooling, and byte-identical at SHA-256
`d196af1c16afe661774ca5e758e1d6e9123065a066411bde3cb0c7639c58364e`.

## Scope audit

The candidate and application-release diffs contain presentation, public
assets, tests, and documentation only. They contain no schema, migration, seed,
API, repository, authentication implementation, dependency manifest, lockfile,
or workspace-resolution change. Therefore no new database dump was created and
no production migration or seed was run.

The closeout repairs stale hosted-test locators to the current onboarding
controls (`Start with the example or start blank`, `Start with example`, and
the current member home) and proves secure session attributes from the server's
`Set-Cookie` response without reading or retaining a cookie value. Focused
tests failed before those expectations were implemented and passed afterward.

## Database and cleanup invariants

Read-only checks before and after hosted QA agree on the application graph:

| Invariant | Before | After |
| --- | ---: | ---: |
| Applied migrations | 8 through repository `0007` | 8 through repository `0007` |
| Catalog exercises | 134 | 134 |
| Exercise-equipment edges | 202 | 202 |
| Exercise aliases | 269 | 269 |
| Approved videos | 54 | 54 |
| Eligible variations | 27 | 27 |
| Invalid constraints / indexes | 0 / 0 | 0 / 0 |
| Enabled user triggers | 17 | 17 |
| Nonterminal deletion jobs | 0 | 0 |

The approved-video projection remained
`e8c7a3be7a7cff96ce6963d8688fbfcae8dcd1ce28a969113bf0f4260ce2fd6c`.
All ordinary owner-scoped application tables returned to zero rows and Firebase
returned to its aggregate baseline of one unrelated existing identity. The
deletion saga intentionally retains terminal audit rows: 83 existed before the
release runs and 104 existed afterward. The 21 additions correspond to the one
password lifecycle and ten bounded two-owner attempts; every added record is
terminal, while its Firebase identity and application-owned data are absent.
These durable deletion audits were not deleted or altered merely to restore a
counter.

## Static, build, and browser gates

| Gate | Result |
| --- | --- |
| TypeScript | Passed |
| ESLint | Passed |
| Vitest | 127 files, 862 tests passed on the application release |
| Final focused hosted harness | 3 files, 7 tests passed |
| Drizzle/schema | 34 database/schema assertions passed |
| Seed policy | 27 eligible variations and 54 exact approved rows; check only |
| PWA generation | Passed |
| Documentation parity before closeout | 63 canonical Markdown documents passed |
| Next.js production build | 16.3.2 Webpack build passed |
| Route boundary | 44 production App Router entries |
| Exact-candidate local Playwright | 90 passed, 42 intentional skips |
| Exact production Playwright | 89 passed, 42 intentional skips, one WebKit-tablet hosted harness limitation |
| Production Chromium offline | `/`, `/progress`, and `/library` passed |

The production matrix covered public `/`, `/progress`, `/library`, program and
exercise details, `/sign-in`, and `/offline` at 320, 390, 430, 820, 1280, and
1440 CSS pixels across maintained Chromium and WebKit phone, tablet, and
desktop projects. It exercised light, dark, reduced-motion, forced-colors,
keyboard, pointer, image failure, app-owned Axe, target size, and strict
overflow/overlap checks. No product assertion failed.

The one complete hosted WebKit-tablet run ended on the harness's localhost-only
failed-request allowlist after a superseded RSC request. Four matching RSC
requests returned 200, one superseded request was cancelled, and the asserted
navigation completed through sign-in. The exact retry reproduced that hosted
harness limitation. No cancellation policy was broadened.

## Companion assets and cache classes

| Variant | 1024 SHA-256 | 512 SHA-256 | Cache class |
| --- | --- | --- | --- |
| Planning hedgehog | `79891bacacde49d7aeff0ad647d1e62a41fb68f56f5d7cbab937c58bfadbb126` | `45995ea9cd380bb344dda92decbe45c00ff66285b6e5e32872b97115528da79b` | Public install |
| Preparing fox | `9812c7a337667f70388aa9b4820f81b4306140e2001998aa18bab30aa814cc33` | `07816814dd9c0e94cfb3b2bfb324425f60b6789b16964780bc1e5f58974d1de3` | Owned only |
| Reviewing raccoon | `94721d121b53e2fa3cfb779e6dab1a8a0932cb5fb2827711ca6ed34634db65f6` | `9f109d0315d72cf47032c539f023b6f4bfc81010f14a813a31be068223b49e72` | Public install |
| Cataloging otter | `357289744bc3fef9a9f283ff9cfde03b5970ac717c87de666930d08f2e3a7b5c` | `4b80975a2690060d59e455c95d5e75a0b2ea6dc3030730d5f45a6b2c7c44a2f6` | Public install |
| Routine-drafting beaver | `493df6e5ec6180547cb7683e3abfc22673652f3505902ed1189fdd9717b3279a` | `994c5e7773ea3eb146fa5be63ccdb97f92c4e55d9f101eae7aca0fb3dc266c23` | Owned only |
| History-archive tortoise | `5b42fb35ca468dad01616c136d80f43781f4d6a28636989db06831b67ec5f6ea` | `cc8455b894aa4b4181e77fdfa8b4f0579fcdb6d63fface888fd0df3bee6dbbed` | Owned only |
| Settings-packing hare | `9d227008d9a4dd7e3dc5cc3d6c5f3fbd0cfea23bcd06fa90ca73dc85915ac0f8` | `d90822b2e3e88855122e5891b94e61c69b3e89b4cf3a7fec20f62b3561b534db` | Owned only |
| Workout-corner bear | `3eb28d8075a24a8b4f8275be747d5caefa9e5d16af71cff4314c3b4fe597ffcb` | `aaecbf17e476b07c4dc4c01df5f99fddc9ab5360a2afd85b4b8f2061c571b5d5` | Owned only |

Manifest SHA-256 is
`f874368ac2e228fa5db496a0edd0d11236250e012203f02774e913f5656443a4`;
service-worker SHA-256 is
`25586c1caac76ac6d5565e35a2b81ec7f2107f091d31a9a6ab6952836735dc5c`.
Cache v6 includes only the hedgehog, raccoon, and otter public pairs. It excludes
the fox, beaver, tortoise, hare, bear, all owned routes, all workout routes,
APIs, authenticated HTML, guidance, personal data, and arbitrary images.
Chromium live-offline replay passed; WebKit service-worker automation remains
an intentional capability skip. IndexedDB owner drafts remained outside public
cache cleanup.

Every companion assertion requires empty alternative text, `aria-hidden`, no
role or accessible name, no focusable or tab-reachable descendant, pointer
inertness, and non-overlap with protected content and controls. Image failure
and forced colors collapse the decorative slot.

## Hosted authentication, authorization, and product proof

The current password lifecycle passed on exact production at Chromium
1440×1000. It covered verification action codes, recovery, recovered-password
sign-in, secure-cookie attributes, three first-party session mutations, and
cleanup. Firebase aggregate count was one before and one after.

The newer two-owner production journey remains authoritative. It passed with
two verified disposable password owners, 12 expected first-party mutations,
four foreign/missing equivalence probes, unchanged global catalog/template
counts, wrong-password refusal, two successful deletions, Firebase one before
and after, and zero remaining application-owner rows. No client UID, identity,
credential, cookie, private URL, or private data entered retained evidence.

An optional extension then visited live Library, editor, Settings, runner, and
History surfaces. It proved each route through History list; a direct immediate
abandon produced the known incomplete-detail behavior. After every exercise was
explicitly skipped, History detail rendered and passed its state, read-only
notice, companion, and Axe assertions. The extended run later encountered one
unclassified browser-console warning, so it is recorded as an attempted partial
lane rather than promoted over the clean authoritative two-owner pass.

## Google and native zoom

After explicit action-time confirmation, production **Continue with Google**
opened Google and stopped before identity selection at the unavoidable
owner-only account-choice/consent boundary. No account was chosen, no consent
was granted, and no MFA or CAPTCHA step was reached. The Google tab was closed,
the application remained on its bounded sign-in return, and no onboarding,
profile, program, workout, guidance, or owner row was created. Earlier Wave 2
production proof remains historical and is not relabeled as exact Wave 4
deployment proof.

Real Chrome at restored 100% reported device-pixel ratio 2, CSS inner width
1512, document client/scroll width 1497/1497, visual viewport width 1497, and
`visualViewport.scale === 1`. Browser-scope zoom keystrokes did not change the
metrics, and the macOS native control bridge closed before it could focus the
QA tab. Therefore the required 200% state is skipped rather than inferred from
CDP page scale, CSS zoom, a halved viewport, or screenshots. The browser remains
at verified 100% with zero horizontal overflow. Safari/WebKit exposes no exact
native-zoom value in this automation environment.

## Bounded production logs

The exact application deployment had zero 5xx responses in the bounded QA
window. Expected 404s were privacy-safe foreign/missing ownership probes: 16
private custom-exercise GETs, 16 private workout GETs, and 16 private program
POSTs; two other 404s were public provenance probes.

Eight error-level entries were status-200 History-detail renders from the
reproduced immediate-abandon limitation. Their single sanitized classification
was `Workout history is incomplete`, repository conflict 409. No function
crash, Neon/database connectivity failure, CSRF failure, authentication bypass,
ownership leak, asset failure, service-worker failure, or unexplained 5xx was
found. No raw log, request identifier, private path, or owner identifier is
retained.

## Evidence retention and closeout

This Markdown file and its generated HTML counterpart replace the integration-
only report and synthetic screenshot directory as the newest production record.
No production screenshot, trace, HAR, video, cookie, token, credential, UID,
email, private URL, private note, routine name, or fitness value is retained.

The containing Git commit is the documentation closeout identity. The final
automatic docs-only production deployment must be `READY` from that exact
commit, retain the existing aliases, and have a byte-identical `src/`, `public/`,
schema, migration, seed, and dependency tree relative to application release
`de19b1c`. Final Git, deployment, database-read, documentation, static, and
cleanup reconciliation is recorded in the release plan and repository status.
