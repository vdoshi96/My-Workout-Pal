# Firebase Admin serverless compatibility

## User outcome

A visitor who opens a private route without a session receives the existing bounded sign-in redirect instead of a server error. A signed-in member reaches the same owner-scoped private application without changing authentication, authorization, persistence, or session-cookie behavior.

## Navigation

- Public routes remain unchanged.
- An unauthenticated request to `/app` or another private page resolves the server viewer and redirects to `/sign-in` with the existing bounded return target.
- An authenticated request continues through Firebase Admin session verification before any owned database read.

## Runtime states

- **Loading:** Vercel initializes the server function and loads Firebase Admin and its transitive JSON Web Key dependencies.
- **Unauthenticated:** The route returns the existing private, no-store sign-in redirect.
- **Authenticated:** Firebase Admin verifies the secure session cookie and the route loads only the server-derived owner.
- **Configuration unavailable:** The existing stable credential/configuration error remains truthful and private.
- **Runtime incompatibility:** A CommonJS loader that cannot load an ESM-only transitive dependency must fail a release test before deployment. It must never reach production as an unclassified `500`.

## Types and invariants

- Keep `firebase-admin` as the trusted server identity SDK.
- Keep the application source and server viewer contracts unchanged.
- Constrain only the incompatible `jwks-rsa` to `jose` transitive edge. The resolved dependency must expose the CommonJS entry point that `jwks-rsa` loads.
- Keep dependency resolution deterministic in `pnpm-workspace.yaml` and `pnpm-lock.yaml`.
- Do not add a client authentication fallback or accept a client-supplied Firebase UID.

## Persistence and authorization

This correction makes no database, migration, seed, cookie, or owner-data change. Firebase Admin still verifies session cookies with revocation checks, and every private repository still receives the server-derived viewer.

## Failure and recovery

- A child-process compatibility test starts Node with native `require(esm)` support turned off. Loading `jwks-rsa` must succeed in that stricter CommonJS boundary.
- The test must fail with the dependency graph that produced the Vercel `ERR_REQUIRE_ESM` error and pass after the reviewed override.
- If dependency installation, type checking, the production build, or the Vercel preview fails, stop the release before Neon migration or production promotion.
- Keep the feature branch recoverable. Revert the bounded dependency override if upstream packages later provide a verified compatible release.

## Responsive behavior and accessibility

The correction has no visual output. Existing phone, tablet, desktop, keyboard, screen-reader, reduced-motion, dark-mode, and forced-color behavior must remain unchanged. The private sign-in redirect must remain usable in every existing browser project.

## Privacy and security

- Do not print Firebase credentials, session cookies, owner identifiers, or provider responses.
- Do not weaken revocation verification, recent-auth requirements, CSRF checks, private cache headers, or cross-user denial.
- Use a narrow transitive dependency override rather than a browser-side token verifier or a custom JWT implementation.
- Retain the upstream issue and exact deployed error as dependency provenance without copying secrets into documentation.

## Acceptance criteria

- The fail-first child-process test reproduces `ERR_REQUIRE_ESM` before the override.
- The resolved graph uses the reviewed CommonJS-compatible `jose` version only for the `jwks-rsa` edge.
- Strict TypeScript, lint, unit and integration tests, dependency installation, the Webpack production build, and production-route isolation pass.
- The exact Git preview reports `Ready` for the pushed commit.
- Authenticated `vercel curl` requests return `200` for public routes and a private no-store sign-in redirect for unauthenticated `/app`; no tested private route returns `500`.
- The preview error-log scan contains no `ERR_REQUIRE_ESM` or new application error after replay.
- Production remains untouched until the corrected preview and the complete release gate pass.

## Automated tests

- Add a focused Node child-process regression for CommonJS loading with `--no-experimental-require-module`.
- Assert the dependency override in the focused compatibility-policy test.
- Run the focused compatibility and package-policy tests.
- Run `pnpm verify` and the public browser matrix after the dependency graph changes.

## Browser and deployment evidence

- Inspect the exact Vercel preview deployment and GitHub status for the corrected commit.
- Replay `/`, `/program`, `/sign-in`, and unauthenticated `/app` through Vercel's protected-deployment request boundary.
- Confirm private cache headers and the bounded sign-in destination on `/app`.
- Scan preview runtime errors after the replay.
- After the complete feature release, repeat the private-route request and error scan on the exact production deployment.

## Source basis

- The Vercel preview and production functions returned `ERR_REQUIRE_ESM` while `jwks-rsa` loaded ESM-only `jose` through CommonJS.
- The upstream Firebase Admin issue documents the same Firebase Admin, `jwks-rsa`, `jose`, Next.js, pnpm, and serverless failure and recommends a scoped `jwks-rsa>jose` override until the dependency publishes a compatible fix.
- Next.js 16 automatically externalizes `firebase-admin`, so Vercel loads its transitive dependencies through the native Node.js runtime boundary.
