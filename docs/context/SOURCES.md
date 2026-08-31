# Sources

## Runtime security and embedded media

- [Next.js Content Security Policy guide](https://nextjs.org/docs/app/guides/content-security-policy) — nonce generation through Proxy, request-time rendering requirements, production and development directives, and performance implications.
- [Next.js Proxy convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) — Next.js 16 request-boundary convention.
- [YouTube API Services Required Minimum Functionality](https://developers.google.com/youtube/terms/required-minimum-functionality) — embedded-player referrer requirement and recommended `strict-origin-when-cross-origin` policy.
- [YouTube embedded-player parameters](https://developers.google.com/youtube/player_parameters) — current non-autoplay controls, inline playback, keyboard behavior, deprecated branding parameters, and the 200-by-200 minimum player viewport.
- [YouTube privacy-enhanced embedding](https://support.google.com/youtube/answer/171780?expand=PrivacyEnhancedMode&hl=en-GB) — `youtube-nocookie.com` embed boundary for privacy-enhanced website playback.
- [YouTube `search.list`](https://developers.google.com/youtube/v3/docs/search/list) — accessed August 26, 2026; confirms the separate default limit of 100 calls per day and one-unit cost per call in the Search Queries bucket.
- [YouTube `videos.list`](https://developers.google.com/youtube/v3/docs/videos/list) — accessed August 26, 2026; confirms the one-unit metadata-hydration cost.
- [YouTube Data API revision history](https://developers.google.com/youtube/v3/revision_history) — accessed August 26, 2026; records the June 1, 2026 transition of `search.list` to its own granular quota bucket.

## Browser verification

- [Playwright service-worker guide](https://playwright.dev/docs/service-workers) — activation guidance and the documented Chromium-only service-worker automation boundary used to scope the offline replay.

## Hosting and persistence

- [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver) — accessed August 27, 2026; distinguishes stateless HTTP queries from the WebSocket `Pool`/`Client` path required for sessions, interactive transactions, and node-postgres compatibility.
- [node-postgres pooling](https://node-postgres.com/features/pooling) — accessed August 27, 2026; documents that a pool emits errors on behalf of idle clients and demonstrates registering a pool `error` listener.
- [Neon Vercel integration plan update](https://neon.com/docs/changelog/2025-11-07) — accessed August 25, 2026; confirms that Vercel integration users can select Neon's current Free plan rather than a paid legacy plan.
- [Connect Vercel and Neon manually](https://neon.com/docs/guides/vercel-manual) — accessed August 25, 2026; confirms the canonical `DATABASE_URL` connection boundary and supported separation between Neon and Vercel configuration.
- [Drizzle ORM Neon guide](https://orm.drizzle.team/docs/connect-neon) — accessed August 25, 2026; confirms the supported Neon serverless driver and Drizzle connection boundary used by migration, seed, and verification commands.
- [Firebase CLI reference](https://firebase.google.com/docs/cli) — accessed August 25, 2026; confirms the official project, web-app, authentication configuration, and authenticated CLI workflow. The local Firebase CLI is not installed; the signed-in Firebase Console verified project `my-workout-pal-92819` and initialized Authentication on August 26, 2026.
- [Vercel Spend Management](https://vercel.com/docs/spend-management) — accessed August 27, 2026; confirms Pro availability, automatic 50%, 75%, and 100% thresholds, alerts-only behavior unless a pause action is enabled, and the team-wide production-pause boundary.
- [Vercel notifications](https://vercel.com/docs/notifications) — accessed August 27, 2026; confirms per-user web, email, push, and SMS notification controls. The authenticated dashboard inspection verified web/email Spend Management subscriptions and all three supported thresholds without changing them.

## Private reference recording

- Source: `bcf6af84-c33c-4bde-a2ab-09794543b489.mp4` in the initial workspace.
- SHA-256: `14b3eec06e3513c17bfa3a093c5623b8cb3548ed48be7aba9060bb42cc78c0ab`.
- Duration: 96.52 seconds.
- Use: workflow and intent analysis only.
- Publication: excluded from Git, deployment, documentation media, and QA artifacts.

The recording shows a five-tab mobile routine, sectioned prescriptions, embedded YouTube instruction, weight and rep entry, rest intervals, logged-set history, strength tabs, a directory, and aggregate analytics. The narrator describes the content as seeded and deletable and says the prototype needs cleanup.

## User product brief

The dedicated implementation brief dated August 25, 2026, is the authoritative source for features, equipment variants, starter prescriptions, authentication, persistence, video curation, verification, provisioning, release, and documentation requirements.

## Generated landing illustration

- Runtime assets: `public/illustrations/workout-pals-gym.webp` plus the source-faithful 768-pixel responsive derivative `public/illustrations/workout-pals-gym-768.webp`.
- Prompt and derivative provenance: private-safe same-basename records under
  `docs/design/provenance/illustrations/`. The fetchable public directory
  contains no JSON provenance, local source path, or generation identifier.
- Generator: OpenAI built-in image generation on August 26, 2026.
- Direction: an original, fully hand-drawn golden-age theatrical-cartoon gym with expressive animal characters; no real person, copied character, text, logo, hotspot, or photographic element.
- Publication: only the optimized WebPs are public assets. Their records retain
  exact prompts, dimensions, transformations, and verified output SHA-256
  hashes without exposing private local generation state.

## Wave 3 companion vignettes

- Selected visual evidence:
  `.impeccable/mocks/companion-concepts/corner-companions-board.png`, its prompt,
  and its JSON provenance. The board is not a runtime or shipping asset.
- Planning hedgehog: `public/illustrations/companions/planning-hedgehog.webp`
  (`79891bacacde49d7aeff0ad647d1e62a41fb68f56f5d7cbab937c58bfadbb126`)
  plus its 512-pixel derivative
  (`45995ea9cd380bb344dda92decbe45c00ff66285b6e5e32872b97115528da79b`).
- Preparing fox: `public/illustrations/companions/preparing-fox.webp`
  (`9812c7a337667f70388aa9b4820f81b4306140e2001998aa18bab30aa814cc33`)
  plus its 512-pixel derivative
  (`07816814dd9c0e94cfb3b2bfb324425f60b6789b16964780bc1e5f58974d1de3`).
- Reviewing raccoon: purpose-built opaque warm-paper card at
  `public/illustrations/companions/reviewing-raccoon.webp`
  (`94721d121b53e2fa3cfb779e6dab1a8a0932cb5fb2827711ca6ed34634db65f6`)
  plus its 512-pixel derivative
  (`9f109d0315d72cf47032c539f023b6f4bfc81010f14a813a31be068223b49e72`).
  The opaque field is the accepted bounded fallback after a lossy chroma-key
  source and a baked-checkerboard rerender were rejected. A 768-pixel companion
  derivative is not part of this responsive contract.
- Cataloging otter: `public/illustrations/companions/cataloging-otter.webp`
  (`357289744bc3fef9a9f283ff9cfde03b5970ac717c87de666930d08f2e3a7b5c`)
  plus its 512-pixel derivative
  (`4b80975a2690060d59e455c95d5e75a0b2ea6dc3030730d5f45a6b2c7c44a2f6`).
- Routine-drafting beaver:
  `public/illustrations/companions/routine-drafting-beaver.webp`
  (`493df6e5ec6180547cb7683e3abfc22673652f3505902ed1189fdd9717b3279a`)
  plus its 512-pixel derivative
  (`994c5e7773ea3eb146fa5be63ccdb97f92c4e55d9f101eae7aca0fb3dc266c23`).
- History-archive tortoise:
  `public/illustrations/companions/history-archive-tortoise.webp`
  (`5b42fb35ca468dad01616c136d80f43781f4d6a28636989db06831b67ec5f6ea`)
  plus its 512-pixel derivative
  (`cc8455b894aa4b4181e77fdfa8b4f0579fcdb6d63fface888fd0df3bee6dbbed`).
- Settings-packing hare:
  `public/illustrations/companions/settings-packing-hare.webp`
  (`9d227008d9a4dd7e3dc5cc3d6c5f3fbd0cfea23bcd06fa90ca73dc85915ac0f8`)
  plus its 512-pixel derivative
  (`d90822b2e3e88855122e5891b94e61c69b3e89b4cf3a7fec20f62b3561b534db`).
- Workout-corner bear:
  `public/illustrations/companions/workout-corner-bear.webp`
  (`3eb28d8075a24a8b4f8275be747d5caefa9e5d16af71cff4314c3b4fe597ffcb`)
  plus its 512-pixel derivative
  (`aaecbf17e476b07c4dc4c01df5f99fddc9ab5360a2afd85b4b8f2061c571b5d5`).
- Generator: OpenAI built-in image generation on August 30, 2026. Exact prompts,
  dimensions, transformations, and shipping hashes for all eight companion
  pairs are stored in private-safe same-basename records under
  `docs/design/provenance/companions/`. The public companion directory contains
  WebPs only; rejected candidates and private generator paths or identifiers do
  not ship.
- Publication constraints: all vignettes are generic, text-free, independent of
  identity and workout data, and contain no real person, logo, copied character,
  chart, semantic status cue, or private data. No character was cropped from the
  concept board or composite gym hero.
- Cache boundary: the existing pilot landing hedgehog and Progress raccoon pairs
  remain public, and Wave 3 adds only the public Library otter pair. The fox,
  beaver, tortoise, hare, bear, owned routes, authenticated HTML, and private
  data remain excluded from the public cache.

Keep primary policy and platform links current when a dependency, curation rule, or deployment capability changes. Record the access date and the decision each source supports.

## Firebase email action codes

Accessed August 27, 2026:

- [Firebase Admin email action links](https://firebase.google.com/docs/auth/admin/email-action-links): documents server-side generation of email-verification and password-reset links for exact Firebase users. The hosted QA extracts the bounded code only in process memory and never dispatches the Admin-generated link.
- [Firebase Authentication REST API](https://firebase.google.com/docs/reference/rest/auth): documents the Identity Toolkit `accounts:update` verification-code operation and `accounts:resetPassword` inspection/confirmation operations used by the hosted QA.

The project uses these endpoints only for exact generated `example.invalid` identities. The evidence proves provider action semantics and production sign-in after reset; it does not claim email delivery or an inbox click.

## Firebase Admin serverless dependency compatibility

Accessed August 27, 2026:

- [pnpm settings](https://pnpm.io/settings#overrides): pnpm 11 reads project dependency-resolution settings such as `overrides` from `pnpm-workspace.yaml`.
- [Firebase Admin issue 3181](https://github.com/firebase/firebase-admin-node/issues/3181): documents the same Firebase Admin, `jwks-rsa`, `jose` 6, pnpm, Next.js, and serverless `ERR_REQUIRE_ESM` failure plus the narrowly scoped `jwks-rsa>jose` workaround.
- [jwks-rsa issue 507](https://github.com/auth0/node-jwks-rsa/issues/507): records the CommonJS `require()` incompatibility after `jose` 6 became ESM-only.
- [Next.js server external packages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages): explains that dependencies may use native Node.js `require`, and lists `firebase-admin` among automatically externalized packages.

The project keeps Firebase Admin as the trusted server verifier, constrains only the incompatible transitive edge, and retains a fail-first CommonJS loading regression. Revisit and remove the override only after a newer upstream graph passes the same local and Vercel preview boundary.
