# Neon CSRF resilience QA

## Outcome

The idle Neon pool error that terminated a warm Vercel function during the Wave 0 Google replay is fixed and released. Application commit `f5ef9cb9a9b462aceda339936972297796b67e16` is on public `main` and production deployment `dpl_9WBb8hprftiKBYGrZfRD9Juk4VKH` is Ready on the stable, project, and Git-main aliases.

No migration, seed mutation, authentication contract, CSRF contract, workout behavior, or product UI changed.

## Failed-before evidence

Wave 0 deployment `dpl_56XvQJJv4enVjRipeHf1USAZmQ5h` recorded an uncaught exception after a successful `GET /api/auth/csrf` response. The stack passed through `@neondatabase/serverless`'s pool `idleListener`, WebSocket stream error reporting, and Node's unhandled `error` event path before the function exited with status `129`.

The focused regression failed before implementation because a pool returned by `createDatabase` had zero `error` listeners. The CSRF route itself never imported the database; it happened to be the unrelated request in flight when a warm process's idle pool re-emitted the error.

## Correction

The database factory now constructs the Neon `Pool` explicitly, registers one listener before passing it to Drizzle, and retains the existing lazy singleton. Neon removes the failed idle client. The listener prevents Node from treating the re-emitted event as uncaught and logs only constant text, never an error object, connection string, query, identity, or fitness data.

Interactive transactions remain on the WebSocket pool. Active query failures still use their existing promise and route failure paths; the idle listener does not retry or convert a failed operation into success.

## Local verification

- Focused database, authentication-order, fixture-policy, and schema slice: 4 files/65 tests.
- Full Vitest: 108 files/739 tests.
- Drizzle metadata and schema/bootstrap checks: 4 files/34 tests.
- Strict TypeScript and full ESLint: passed.
- Exact-two seed and service-worker verification: passed.
- Documentation parity before closeout: 46 Markdown/HTML pairs.
- Next.js 16.3.2 Webpack production build and 41-route boundary: passed.
- Public production-mode browser matrix: 47 passed with one maintained WebKit service-worker capability skip.
- Authenticated production-mode browser matrix: 34 passed with two intentional engine-scoped skips.

The first sandboxed full run failed only because the YouTube probe could not bind loopback (`listen EPERM 127.0.0.1`). The permission-correct rerun passed all 739 tests.

## Hosted verification

Preview deployment `dpl_9SA5qVuVda9Way6txNg5gm2nbxG5` was Ready for the exact application commit. Five protected-preview CSRF requests returned `200`, GitHub's Vercel status succeeded, and the preview error scan was empty.

Production deployment `dpl_9WBb8hprftiKBYGrZfRD9Juk4VKH` was then created from the same commit and became Ready on all production aliases. The mutation-free production replay performed:

1. One `200` request to `/library/dumbbell-bench-press`, which reads the approved video pair through the Neon pool.
2. A 15-second wait beyond the pool's configured idle timeout.
3. Five further database-backed exercise requests, all `200`.
4. Five interleaved `/api/auth/csrf` requests, all `200`.
5. A second idle interval and a bounded exact-deployment error scan.

The request log contains all eleven successful requests. The error scan contains no unhandled pool event and no handled idle-error diagnostic. Production remains at zero profiles, zero programs, zero program revisions, and zero workout sessions. The existing database verifier still reports 6 equipment rows, 27 exercises, 44 equipment edges, 54 aliases, 2 template revisions, 10 days, 26 sections, 60 prescriptions, 20 cardio rows, and 54 approved starter videos.

The existing browser session was signed out, so the replay deliberately used the public database-backed exercise route rather than logging in, creating accounts, or mutating owned data. The broader deletion/IDOR harness was not run because it exceeded this replay's authorization.

## Operational cleanup

- Local `main`, public `origin/main`, and application commit were synchronized before closeout documentation.
- The restore-tested pre-`0005` archive was moved out of temporary storage into a durable user-private backup directory. Its 189,394-byte size, mode `600`, and SHA-256 `26a8b1a029003363ab3dc462774e3305ea2360e01bc396d4967acbdcdea44aa9` were preserved.
- Homebrew's existing .NET 9.0.120 installation was relinked without downloading or reinstalling it. `/opt/homebrew/bin/dotnet` and both installed 9.0.19 runtimes are available.

## Exercise link handoff

The product owner explicitly approved the newer Grok 4.6 link selection: 216 URLs covering all 108 expansion movements. Every selected URL has start-to-end visual-timeline evidence and a successful scoped `youtube-nocookie` embed probe in the retained research document.

This is final product-selection approval, not a claim that audio was reviewed. Runtime `approved_pair` rows still require the existing full-watch record before seeding, as required by the repository's curation policy. Wave 1 does not need another link-discovery or selection pass.

## Release decision

The resilience defect is closed. No unresolved migration, authentication, persistence, recovery, local-tooling, or pool-lifecycle gate blocks Wave 1.
