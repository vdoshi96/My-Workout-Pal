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

- [Neon Vercel integration plan update](https://neon.com/docs/changelog/2025-11-07) — accessed August 25, 2026; confirms that Vercel integration users can select Neon's current Free plan rather than a paid legacy plan.
- [Connect Vercel and Neon manually](https://neon.com/docs/guides/vercel-manual) — accessed August 25, 2026; confirms the canonical `DATABASE_URL` connection boundary and supported separation between Neon and Vercel configuration.
- [Drizzle ORM Neon guide](https://orm.drizzle.team/docs/connect-neon) — accessed August 25, 2026; confirms the supported Neon serverless driver and Drizzle connection boundary used by migration, seed, and verification commands.
- [Firebase CLI reference](https://firebase.google.com/docs/cli) — accessed August 25, 2026; confirms the official project, web-app, authentication configuration, and authenticated CLI workflow. The local Firebase CLI is not installed; the signed-in Firebase Console verified project `my-workout-pal-92819` and initialized Authentication on August 26, 2026.

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
- Prompt and derivative provenance: the same-basename JSON sidecar beside each WebP.
- Generator: OpenAI built-in image generation on August 26, 2026.
- Direction: an original, fully hand-drawn golden-age theatrical-cartoon gym with expressive animal characters; no real person, copied character, text, logo, hotspot, or photographic element.
- Publication: the optimized WebP and its prompt sidecar are project assets. Superseded generated candidates and private local source outputs are excluded.

Keep primary policy and platform links current when a dependency, curation rule, or deployment capability changes. Record the access date and the decision each source supports.
