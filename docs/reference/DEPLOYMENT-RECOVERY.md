# Deployment, cost, and recovery

## Environments

- Local development uses local environment variables and an isolated development database branch.
- Pull requests use Vercel previews and Neon preview branches when the native integration supports them.
- Production deploys only from `main` after preview verification.
- Firebase uses authorized local, preview, and production origins. Separate projects are preferred when account and quota access permit; otherwise emulator-backed tests and explicit environment restrictions prevent test-user leakage.

Secrets live only in local or Vercel environment storage. `.env.example` contains names and setup guidance with empty values.

## Vercel and Neon provisioning

The target Vercel team is `vdoshi96s-projects`. Project `my-workout-pal` is linked as `prj_aHNqBtTx1irlbhNNvHTvynQkb0P9` on Pro. It is connected to public GitHub repository `vdoshi96/My-Workout-Pal` with production branch `main`, native pull-request previews, and preview comments. The first deployment was automatically assigned to production by Vercel and is publicly aliased at `https://my-workout-pal-chi.vercel.app`.

Neon resource `my-workout-pal-db` was provisioned on August 25, 2026 through the Vercel Marketplace using the explicitly listed `free_v3` plan in `iad1`. Neon Auth is disabled because Firebase owns user identity. The integration attached database variables to development, preview, and production and pulled an ignored local development environment file. Do not accept a paid plan, trial conversion, plan upgrade, or billable add-on without explicit approval.

The complete starter graph is live. The initial seed, idempotent seed rerun, account-deletion saga, canonical workout measurement, and owned-program collection migrations passed on August 25, 2026. Read-only verification before and after that migration sequence returned the same 6 equipment rows, 27 exercises, 44 compatibility edges, 54 aliases, 2 revisions, 10 days, 26 sections, 60 prescriptions, 20 cardio choices, and 0 approved videos at that pre-video checkpoint. On August 26, 2026, exact pushed commit `6f582b4` supplied the reviewed 54-video manifest. Baseline verification failed closed only on those expected missing IDs; the first seed installed all 54 approved videos; the idempotent replay returned identical counts; and both post-seed read-only verifications passed without drift or unexpected rows. Run the same checked-in boundaries without printing connection values:

```sh
node --env-file-if-exists=.env.local --import tsx scripts/db-migrate.ts
node --env-file-if-exists=.env.local --import tsx scripts/db-seed.ts
node --env-file-if-exists=.env.local --import tsx scripts/db-verify.ts
```

The seeder constructs new template revisions as drafts, writes and verifies all children, then publishes. A published revision or child mismatch aborts; it is never repaired in place. The 54 video rows pass the exact-two manual approval gate, are part of the checked-in deterministic starter seed, and are verified in Neon. Replaying both public/runtime pairs in protected preview and production browsers remains a separate release action.

Exact protected preview `dpl_6XaYkKMfTTUt7DLM51Rxs9dJRmgF` from source `b470f51` has catalog-complete SSR and representative Firefox playback evidence. A manifest-driven authenticated `vercel curl` verifier passed all 27 public exercise routes with HTTP/2 `200`, exactly the mapping's two unique approved IDs, no pending/incomplete-review copy, and exactly one display-order-1 `youtube-nocookie` iframe plus direct fallback per response. The user's protected Firefox session then showed the two approved tabs, title/channel/direct fallback, one privacy-enhanced iframe at a time, and live English captions plus the browser playing indicator after switching to Demo 2 on both corrected representative routes. A 24-hour error-log query returned no entries. This evidence confirms Neon-backed catalog rendering and playback in one real preview browser; it does not replace the remaining responsive/accessibility matrix or Firebase-authenticated replay.

Guest-release feature SHA `5a1815f4489f11e1485137ca480e81ae5f927fff` deployed Ready as protected preview `dpl_ANFGkZd82kPLanMuF1XNijHDWfez`. Authenticated server requests verified the landing, program, day, malformed-query, Firebase sign-in, contextual-return, and approved-video surfaces; GitHub status passed and the one-hour error log was empty. The in-app browser reached Vercel's protection login, so interactive evidence comes from the public production deployment rather than an invented preview bypass.

The byte-identical release tree merged to `main` as `6f62e1e22fbaaabaa86a613992445d04cfffa310` and deployed Ready as production `dpl_CkVVS1K2yDJYXUmnZgxLRxV37yZZ`. The public alias passed real desktop, 390-by-664 phone, and 820-by-1180 tablet browser replay; exact contextual return, Demo 2 switching with one iframe, malformed-query fallbacks, responsive artwork selection, PWA update reload, zero overflow, zero console warning/error, GitHub deployment status, and the post-run error-log query all passed. This public guest proof does not replace the remaining authenticated hosted matrix or real production playback-indicator check.

Vercel Firebase configuration was explicitly authorized on August 26, 2026. Six non-private browser/identity values are attached to Production, Preview, and Development. `FIREBASE_PRIVATE_KEY` is Hidden/Sensitive in Production and Preview. Vercel does not accept sensitive Development values, so the private key remains absent from that scope and continues to live only in ignored local development storage. Do not work around that safety boundary by uploading it as non-sensitive. No value was printed or copied into documentation.

Primary references:

- [Neon on Vercel Marketplace](https://vercel.com/marketplace/neon)
- [Storage on Vercel Marketplace](https://vercel.com/docs/marketplace-storage)
- [Neon Vercel integration plan update](https://neon.com/docs/changelog/2025-11-07)

## Spend management

The Vercel Pro plan includes a $20 monthly credit after included allocations. Credit does not make overage impossible. Spend Management can notify, call a webhook, or pause production projects at the configured spend amount. Setting a spend amount does not pause usage unless the pause action is enabled.

Configure the following controls only within the existing Pro plan and without increasing paid limits:

- Confirm the automatic 50%, 75%, and 100% spend-amount web and email notifications.
- Configure a 90% usage notification where the Vercel dashboard exposes that threshold for the relevant usage category. The Spend Management budget itself documents only 50%, 75%, and 100%; record any unavailable 90% control rather than claiming it exists.
- Enable the supported pause-all-production-projects action at 100% of the chosen spend amount as the hard-cap behavior.
- Record that checks can lag the threshold and that some overage can occur before pause takes effect.
- Do not set or change the spend amount until the user approves the dollar value because it controls potential billing and can pause unrelated team projects.

The production deployment confirms the team and deployment are on Pro. The in-app browser is not signed in to Vercel, so current Spend Management state and personal notification channels have not been changed or claimed. Official current documentation exposes automatic spend-budget thresholds at 50%, 75%, and 100%; a separate 90% usage notification may exist per usage category, but 90% is not a Spend Management budget threshold. No positive overage amount is authorized.

Track the following usage separately:

- Vercel function invocations, duration, memory, and failures.
- Fast Data Transfer and Fast Origin Transfer.
- Edge requests.
- Build minutes and deployment frequency.
- Image optimization transformations and cache misses.
- Neon compute, storage, data transfer, branches, and connection limits.
- YouTube Data API daily quota and per-command estimates.

Application HTML intentionally uses request-time rendering for a nonce-based CSP. Include the resulting function invocations, duration, and Fast Origin Transfer in usage review; do not assume that guest HTML receives static CDN caching.

Primary references:

- [Vercel Pro plan](https://vercel.com/docs/plans/pro-plan)
- [Spend Management](https://vercel.com/docs/spend-management)
- [Manage and optimize usage](https://vercel.com/docs/pricing/manage-and-optimize-usage)
- [Vercel notifications](https://vercel.com/docs/notifications)

## Release procedure

1. Confirm the feature branch is clean and documentation parity passes.
2. Run the full local verification matrix and retain only the newest completed evidence.
3. Push the branch and inspect the Vercel preview commit and environment-variable presence.
4. Apply only approved preview migrations and seed data.
5. Replay the required browser, security, accessibility, PWA, and embed flows on preview.
6. Inspect build and runtime logs by request ID.
7. Merge the verified branch into `main` without bypassing required checks.
8. Update local `main` to the exact GitHub commit.
9. Wait for the production deployment and verify its source commit.
10. Apply production migration and seed changes only when they were reviewed and authorized as part of the release.
11. Replay production guest and representative authenticated flows with production-safe test data.
12. Confirm local main, GitHub main, and production report the same commit.
13. Remove completed worktrees and record any unresolved worktree and reason.

## Runtime recovery

### Application rollback

Promote the last verified Vercel deployment only when its database schema remains compatible. Confirm the promoted deployment commit and replay a safe smoke test. A deployment rollback does not reverse database migrations.

### Firebase Admin runtime preflight

Firebase Admin is externalized by Next.js and loads through Vercel's native Node.js serverless boundary. As of August 27, 2026, `firebase-admin@14.3.0` reaches `jwks-rsa@4.1.0`, whose CommonJS loader is incompatible with ESM-only `jose@6.2.10` in this deployed boundary. The repository therefore constrains only `jwks-rsa>jose` to reviewed `4.15.9` in `pnpm-workspace.yaml`.

Before preview or production promotion, run:

```sh
pnpm exec vitest run tests/unit/firebase-admin-serverless-compatibility.test.ts
pnpm why jose
pnpm build
pnpm production:check
```

The compatibility test must pass with native `require(esm)` interop disabled, and `pnpm why jose` must show the override only through `jwks-rsa` and Firebase Admin. Then replay an unauthenticated private route on the exact Vercel preview. `/app` must resolve to the bounded `/sign-in?returnTo=%2Fapp` path with private no-store headers and no runtime error; a successful build alone is insufficient. Remove the override only after a newer upstream dependency graph passes this same deployed proof.

### Database recovery

Use forward-compatible migrations. Before a destructive migration, create and verify a recovery point or branch through supported Neon features. Recovery requires an explicit target, impact statement, and verification query. Never run an unscoped restore against production.

For starter-data drift, run `db:verify` first. Catalog drift requires an explicit reviewed migration. Published template drift requires a new revision or a recovery from a verified point; do not disable immutability triggers or rewrite a published child. Rerunning `db:seed` is safe only when verification agrees with the deterministic graph.

Migration `0004_personal_record_projection_checkpoint` and its rebuild operator remain on the unreleased customization branch as of August 27, 2026, but the additive table migration is applied to Neon after fresh-chain and populated-upgrade PGlite verification. Preflight found 0 completed sessions and 0 personal-record rows. Dry run, apply, and immediate apply replay all reported zero candidates and zero changes; the durable v2 checkpoint is completed with a cleared cursor and zero counters. Do not run a future calculation version's operator until its matching forward migration and application source are reviewed together.

After migration, inspect historical personal-record projection changes with the dry-run default:

```sh
pnpm db:rebuild-personal-records
pnpm db:rebuild-personal-records -- --batch-size 50
```

Dry run uses short per-batch read transactions and reports scanned sessions, candidates, and proposed insert/update/delete counts without changing records or the durable checkpoint. Output never includes a Firebase UID, source UUID, SQL text, connection detail, or raw database error. Repeating `--dry-run`, `--apply`, or `--batch-size`, or mixing dry-run and apply modes, fails closed.

Only after the environment, migration, counts, and current calculation version are reviewed may the same bounded operator apply:

```sh
pnpm db:rebuild-personal-records -- --apply --batch-size 50
```

Apply commits each deterministic session batch, stores only the last globally ordered workout-session UUID, and resumes after interruption. Completion clears that cursor. A rerun must report an idempotent no-op. Recognized lower-version rows that the current algorithm no longer emits are removed; unknown future-version rows are preserved but excluded from this build's read model. Account deletion cannot strand a Firebase UID in the checkpoint because the table never stores one. Never run an unbounded production apply or retain unsanitized provider/database output.

### Authentication recovery

If session verification fails broadly, keep public content available, block permanent mutations, clear invalid cookies, and guide sign-in. Rotate a compromised Admin credential in Firebase and Vercel, revoke affected refresh tokens, and verify that logs contain no secret values.

For an account-deletion job left in the Firebase phase, inspect with the dry-run default:

```sh
pnpm account:reconcile
pnpm account:reconcile -- --owner FIREBASE_UID --limit 1
```

Output uses an opaque fingerprint rather than the raw UID. `identity_exists` means reconciliation leaves the job unchanged and never deletes that identity. `would_complete` means Firebase Admin returned `auth/user-not-found`; review the environment and fingerprint before any apply. Provider uncertainty or completion-write failure exits nonzero with a safe code.

After verifying the exact environment and receiving explicit approval for the target, apply one candidate:

```sh
pnpm account:reconcile -- --apply --owner FIREBASE_UID --limit 1
```

The apply path locks and optimistic-checks the Firebase-phase job before its monotonic completion transition. It is replay-safe and does not restore or recreate fitness data. Never run an unscoped production apply, paste output containing credentials into documentation, or use this command to delete an existing Firebase identity.

Bounded multi-job apply exists only behind the additional `--batch` flag and still requires a limit no greater than 100. Prefer the one-owner command. A production batch requires separate explicit scope approval and a reviewed dry-run report.

### Video recovery

If one demonstration fails, show the remaining approved option and direct YouTube link. If both fail, show the unavailable state and open a reviewed replacement workflow. Do not hot-swap an unapproved video.

### Service-worker recovery

Publish a new cache version, retain pending IndexedDB operations, and remove only obsolete My Workout Pal public caches during activation. The worker is generated from `src/domain/pwa/cache-policy.ts`; run `pnpm pwa:build` after an intentional policy change and `pnpm pwa:check` before release. Authentication, APIs, owned-data routes, arbitrary images, cross-origin assets, and non-GET requests must stay outside the public cache. If a worker causes a critical navigation failure, publish a compatibility worker that unregisters safely after it restores ordinary network navigation.

## Credential and approval gates

- GitHub source and Vercel Git integration are configured. Local, GitHub, and deployment commit metadata must still be checked after every release.
- Firebase project `my-workout-pal-92819` exists on Spark with its web app, Email/Password and Google providers, reviewed public settings, and required authorized domains configured. Ignored local storage contains the validated client/Admin values. After explicit authorization, the six non-private values are attached to Vercel Production, Preview, and Development; the Admin private key is Hidden/Sensitive in Production and Preview and intentionally absent from Development because Vercel rejects sensitive Development variables. Hosted Google, recovery, expiry, revocation, and adversarial account-flow replay remain verification work; terms or 2FA remain user actions if a provider prompts for them.
- Neon is already connected on `free_v3`; any plan change, billing method, trial acceptance, or billable add-on requires the user.
- Spend amount and hard-cap configuration can affect every project on the Vercel team and requires the user to approve the dollar amount before mutation.
- Ignored `.env.local` contains the YouTube Data API key. The published exact-two manifest and Neon seed are complete. Any future refresh or replacement run still requires successful bounded discovery with sufficient quota, mechanical eligibility, full-watch and scoped playback approval, exact-two validation, and an explicitly reviewed publication change.
