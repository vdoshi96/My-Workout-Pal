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

### Database recovery

Use forward-compatible migrations. Before a destructive migration, create and verify a recovery point or branch through supported Neon features. Recovery requires an explicit target, impact statement, and verification query. Never run an unscoped restore against production.

For starter-data drift, run `db:verify` first. Catalog drift requires an explicit reviewed migration. Published template drift requires a new revision or a recovery from a verified point; do not disable immutability triggers or rewrite a published child. Rerunning `db:seed` is safe only when verification agrees with the deterministic graph.

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
- Firebase project `my-workout-pal-92819` exists on Spark. Firebase Authentication is initialized, and Email/Password is enabled. Web-app registration, Google provider configuration, authorized domains, email templates, Admin credentials, and local/Vercel variables remain pending. Browser confirmation is required immediately before creating the web app/API key or saving the support email. Terms or 2FA remain user actions when prompted.
- Neon is already connected on `free_v3`; any plan change, billing method, trial acceptance, or billable add-on requires the user.
- Spend amount and hard-cap configuration can affect every project on the Vercel team and requires the user to approve the dollar amount before mutation.
- Ignored `.env.local` contains the YouTube Data API key. Curation still requires a successful bounded request, sufficient quota, mechanical eligibility, full-watch approval, and exact-two seed validation.
