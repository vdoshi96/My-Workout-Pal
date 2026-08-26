# YouTube seed publication checkpoint

## Outcome

The final private curation report has 27 approved canonical pairs and 54 globally unique selected IDs. Every selected candidate has complete visual playback, scoped localhost privacy-enhanced embed playback, direct fallback, visible controls, keyboard evidence, exact-variation review, and a truthful narration, captions, or visual instruction basis. The deterministic schema-one production manifest is checked in and the starter graph now includes all 54 approved rows by default.

The manifest-publication checkpoint itself was local and made no database, Vercel, Firebase, deployment, paid-service, or production change. A later independently reviewed operation applied this exact pushed commit to Neon; that database evidence is recorded below and does not claim Vercel preview or public-production browser proof.

## Production boundary

`pnpm youtube:generate-seed` reads the ignored final report and atomically writes only the checked-in durable manifest. It independently requires:

- one approved proposal for every one of the 27 canonical variations;
- exactly two scoped candidates per proposal and 54 globally unique IDs;
- an eligible effective decision and `syndicationEvidence: verified` for every selected candidate;
- full watch, exact variation, concise and safe instruction, material value, named reviewer, canonical review timestamp, and narration/captions/visual evidence;
- exactly ten allowed row fields, with no view count, query provenance, transcript, frame, cookie, token, path, or private evidence.

The parser rejects missing or duplicate proposals/candidates, unsupported targets, incomplete reviews, Search-filter-only syndication, invalid timestamps, extra fields, duplicate IDs, and duplicate display orders. Review timestamps normalize through `toISOString()` before deterministic database comparison.

## Adversarial selection correction

Line-by-line inspection of the first generated manifest found two selections that passed structural exact-two validation but contradicted the durable manual-review narrative. Fresh full replay established the terminal truth:

- `sQ6jUJhKwhw` is a 42-second wide-grip chest-supported-row specialization, so it is rejected `wrong-movement`. The canonical pair is `vmX58YYK3-8` plus `mHBOUz9KY9A`.
- `tH0stBpF7ko` explicitly instructs standing with the front of each foot on 10-pound plates around 0:45, so it is rejected `wrong-equipment` for the dumbbells-only profile. The canonical pair is `KrRtk8KbJik` plus `MprE4ppd27U`.

Both corrected rejections retain truthful full-watch and visual evidence. Zero-request report regeneration made no Search or hydration call, preserved 27 approved pairs and 54 unique selected IDs, and the checked-in test now pins both corrected pair identities. This adversarial stop occurred before commit or Neon mutation.

## TDD and verification

The retained red test expected 54 default starter video rows and received zero before manifest wiring. A PGlite replay then exposed a no-fractional-second timestamp drift; canonical ISO normalization fixed that comparison without changing the reviewed instant.

Passing evidence on August 26, 2026:

- deterministic generation produced the same SHA-256 on consecutive runs;
- `seed:check` passed 27 required variations with exactly two approved videos;
- the manifest contains 54 rows, 54 unique IDs, 27 pairs, and only the ten permitted durable fields;
- the focused generator, command, publication, starter-bootstrap, repository, and seed-validation matrix passed 7 files and 34 tests;
- strict TypeScript and full ESLint passed;
- the permission-correct full Vitest run passed 73 files and 493 tests;
- generated service-worker parity, 28-document Markdown/HTML parity, and Drizzle metadata validation passed;
- the Next.js 16.3.2 Webpack production build passed.

The first sandboxed full run passed 492 assertions and failed only when the localhost embed-probe test could not bind `127.0.0.1` with `EPERM`. The identical permission-correct suite passed 493 of 493; this was an execution-permission condition, not a product assertion failure.

## Production Neon verification

The reviewed database operation ran from exact pushed commit `6f582b4` on August 26, 2026:

- baseline `db:verify` failed closed only on the expected 54 missing curated-video IDs and reported no unexpected row;
- the first `db:seed` passed with 6 equipment rows, 27 exercises, 44 compatibility edges, 54 aliases, 2 revisions, 10 days, 26 sections, 60 prescriptions, 20 cardio choices, and 54 approved videos;
- the first post-seed read-only `db:verify` passed;
- an idempotent `db:seed` replay returned the identical counts;
- the final read-only `db:verify` passed without drift or unexpected rows.

No connection value was printed. This operation did not deploy or mutate Vercel or Firebase.

## Protected preview server rendering

Exact preview deployment `dpl_6XaYkKMfTTUt7DLM51Rxs9dJRmgF` at source `b470f51` is Ready. Authenticated `vercel curl` returned `200` with security headers for:

- `/library/chest-supported-dumbbell-row`, whose HTML contains `vmX58YYK3-8` and `mHBOUz9KY9A` and omits rejected `sQ6jUJhKwhw`;
- `/library/dumbbell-romanian-deadlift`, whose HTML contains `KrRtk8KbJik` and `MprE4ppd27U` and omits rejected `tH0stBpF7ko`.

A strengthened manifest-driven replay covered all 27 `/library/<slug>` routes and required HTTP/2 `200`, exactly the two unique approved IDs for that mapping, Approved pair copy, no manual-review-pending or incomplete-human-review copy, exactly one iframe, exactly one `youtube-nocookie` embed using display order 1, and the corresponding direct fallback. Result: 27 routes, 27 passing, zero failures. `vercel logs --level error --since 24h` returned no entries.

The user's existing Firefox session then opened the exact protected preview directly, without changing deployment protection. Each corrected representative route rendered two approved tabs, visible title/channel attribution, a direct fallback, and one `youtube-nocookie` iframe at a time. Switching to Demo 2 produced the interaction-rendered second fallback, live English captions, and Firefox's playing indicator for both `mHBOUz9KY9A` and `MprE4ppd27U`, proving real playback of the corrected selections. This is catalog-complete SSR plus representative browser playback; it does not claim the remaining phone/tablet/desktop, keyboard, reduced-motion, dark-mode, reflow, Axe, unavailable-fallback, authenticated-runner, or production matrix.

## Remaining release evidence

- Extend the representative Firefox playback to the protected preview's phone, tablet, desktop, keyboard, reduced-motion, dark-mode, reflow, Axe, direct-fallback, and authenticated-runner matrix.
- Replay keyboard tab selection, one active non-autoplay iframe, direct fallback, dark mode, reduced motion, 200 percent reflow, Axe, and real playback.
- Repeat the representative pair and fallback checks on production after promotion, then inspect runtime logs.
