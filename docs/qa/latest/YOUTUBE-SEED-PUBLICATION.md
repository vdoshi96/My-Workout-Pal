# YouTube seed publication checkpoint

## Outcome

The final private curation report has 27 approved canonical pairs and 54 globally unique selected IDs. Every selected candidate has complete visual playback, scoped localhost privacy-enhanced embed playback, direct fallback, visible controls, keyboard evidence, exact-variation review, and a truthful narration, captions, or visual instruction basis. The deterministic schema-one production manifest is checked in and the starter graph now includes all 54 approved rows by default.

This is a local publication checkpoint, not Neon, Vercel preview, or production proof. No database seed, Vercel environment change, deployment promotion, paid-service change, or production mutation occurred in this checkpoint.

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

## Remaining release evidence

- Apply the reviewed deterministic seed to Neon and verify exact values plus idempotent replay.
- Render representative real pairs from Neon on the protected Vercel preview in phone, tablet, and desktop layouts.
- Replay keyboard tab selection, one active non-autoplay iframe, direct fallback, dark mode, reduced motion, 200 percent reflow, Axe, and real playback.
- Repeat the representative pair and fallback checks on production after promotion, then inspect runtime logs.
