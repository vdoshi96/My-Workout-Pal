# Deployment, cost, and recovery

## Environments

- Local development uses local environment variables and an isolated development database branch.
- Pull requests use Vercel previews and Neon preview branches when the native integration supports them.
- Production deploys only from `main` after preview verification.
- Firebase uses authorized local, preview, and production origins. Separate projects are preferred when account and quota access permit; otherwise emulator-backed tests and explicit environment restrictions prevent test-user leakage.

Secrets live only in local or Vercel environment storage. `.env.example` contains names and setup guidance with empty values.

## Vercel and Neon provisioning

The target Vercel team is `vdoshi96s-projects`. Local project `my-workout-pal` is linked as `prj_aHNqBtTx1irlbhNNvHTvynQkb0P9`; it currently has no deployment. Link the eventual GitHub repository and configure production from `main` with pull-request previews.

Neon resource `my-workout-pal-db` was provisioned on August 25, 2026 through the Vercel Marketplace using the explicitly listed `free_v3` plan in `iad1`. Neon Auth is disabled because Firebase owns user identity. The integration attached database variables to development, preview, and production and pulled an ignored local development environment file. Do not accept a paid plan, trial conversion, plan upgrade, or billable add-on without explicit approval.

The initial schema and starter graph are live. The first migration, first seed, idempotent seed rerun, and read-only verification passed on August 25, 2026. Run the same checked-in boundaries without printing connection values:

```sh
node --env-file-if-exists=.env.local --import tsx scripts/db-migrate.ts
node --env-file-if-exists=.env.local --import tsx scripts/db-seed.ts
node --env-file-if-exists=.env.local --import tsx scripts/db-verify.ts
```

The seeder constructs new template revisions as drafts, writes and verifies all children, then publishes. A published revision or child mismatch aborts; it is never repaired in place. Production video rows remain outside this starter seed until the exact-two manual approval gate is satisfied.

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

### Video recovery

If one demonstration fails, show the remaining approved option and direct YouTube link. If both fail, show the unavailable state and open a reviewed replacement workflow. Do not hot-swap an unapproved video.

### Service-worker recovery

Publish a new cache version, retain pending IndexedDB operations, and remove only obsolete My Workout Pal public caches during activation. The worker is generated from `src/domain/pwa/cache-policy.ts`; run `pnpm pwa:build` after an intentional policy change and `pnpm pwa:check` before release. Authentication, APIs, owned-data routes, arbitrary images, cross-origin assets, and non-GET requests must stay outside the public cache. If a worker causes a critical navigation failure, publish a compatibility worker that unregisters safely after it restores ordinary network navigation.

## Credential and approval gates

- GitHub repository creation and push require a valid authenticated GitHub credential.
- Firebase project creation, provider configuration, authorized domains, email templates, and Admin credentials require Firebase console access. Terms or 2FA remain user actions when prompted.
- Neon is already connected on `free_v3`; any plan change, billing method, trial acceptance, or billable add-on requires the user.
- Spend amount and hard-cap configuration can affect every project on the Vercel team and requires the user to approve the dollar amount before mutation.
- YouTube curation requires an official API key and sufficient quota.
