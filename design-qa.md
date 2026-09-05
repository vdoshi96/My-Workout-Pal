# Wave 4 production design QA

Historical release record. The current Quiet Set redesign and cartoon art verification are recorded in [Quiet Set QA](docs/qa/latest/QUIET-SET-QA.md). The Wave 4 identities and findings below remain evidence of that earlier release.

## Result

The reviewed Corner Companions system is released on public production from
application commit `de19b1c89c34235723158ad8858f6b46f4fcde72` and Ready
deployment `dpl_7836V51i4HzkkCcaG8Bz6QoZYE6z`. The production build preserves
the pilot surfaces and extends the same field-atlas visual system to public and
member Library, the owned routine editor, History, Settings, and the neutral
runner. No companion becomes navigation, coaching, status, validation, or data.

Wave 4 changes presentation, public assets, tests, and documentation only. It
does not change schema, migrations, seed, API, repository, authentication, or
dependencies.

## Surface disposition

| Surface | Production contract | Result |
| --- | --- | --- |
| Guest landing / Progress | Hedgehog and raccoon remain atmospheric, complete, and separate from copy, sample disclosure, metrics, and actions. | Pass |
| Public/member Library | Otter occupies reserved heading whitespace outside search, filters, creation, equipment, results, and private member data. | Pass |
| Owned routine editor | Beaver appears only in a clean neutral broad heading and collapses before equipment review, dirty, validation, chooser, removal, status, or error state. | Pass |
| History list/detail | Tortoise remains outside filters, pagination, immutable facts, sets, cardio, and notes; phone and empty/critical states collapse it. | Pass for companion behavior |
| Settings | Hare requires verified, identity-ready, clean, neutral tablet/desktop state and collapses before dirty, save, error, or deletion state. | Pass |
| Workout runner | Bear requires recovered, online, neutral broad state and collapses for guidance, logging, timer, pending, offline, recovery, error, and terminal states. | Pass |

The History row/detail repository issue found during immediate abandonment is a
product-data follow-up, not a companion-layout failure. The detail rendered and
passed its companion and accessibility assertions after every exercise was
explicitly skipped before abandonment.

## Accessibility, privacy, and resilience

All eight registered companions use complete purpose-built 1024/512 WebP pairs,
empty alternative text, `aria-hidden="true"`, no accessible role or name, no
focusable descendant, disabled dragging, and a pointer-inert slot. Strict
geometry and hit-testing keep them outside headings, controls, charts, data,
notices, fixed navigation, and touch targets. Image failure and forced colors
collapse the slot; reduced motion keeps the art static.

Fetchable illustration directories contain WebPs only. Private-safe provenance
records retain prompt, dimension, transformation, and hash facts under
`docs/design/provenance/` without local paths or generator identifiers. The
composite concept board remains evidence and never ships.

## Responsive and cache proof

The maintained matrix covers 320, 390, 430, 820, 1280, and 1440 CSS pixels in
Chromium and WebKit phone, tablet, and desktop projects, plus light, dark,
reduced-motion, forced-colors, image-failure, keyboard, pointer, focus, Axe,
target-size, and strict overflow/overlap checks. Exact production Chromium
offline replay passed for `/`, `/progress`, and `/library`.

PWA cache v6 includes only planning hedgehog, reviewing raccoon, and cataloging
otter public variants. Preparing fox, routine-drafting beaver, history-archive
tortoise, settings-packing hare, workout-corner bear, private routes,
authenticated HTML, APIs, guidance, owned data, and arbitrary images remain
excluded.

## Native zoom and browser limitations

Real Chrome at restored 100% reported DPR 2, CSS inner width 1512, document
client/scroll width 1497/1497, and `visualViewport.scale === 1`. Browser-scope
keystrokes did not establish 200%, and the macOS native control bridge closed
before it could focus the QA tab. No CDP page scale, CSS zoom, halved viewport,
or screenshot inference is substituted. Safari/WebKit exact native zoom also
remains unavailable in this automation environment.

The exact production Playwright matrix recorded one WebKit-tablet hosted-origin
RSC cancellation after the asserted navigation completed. The user-authorized
waiver applies only to that documented engine/harness limitation and does not
broaden cancellation policy or weaken a product assertion.

## Canonical evidence

The production source, asset hashes, cache classes, test counts, database
invariants, authentication/ownership proof, log audit, cleanup, and limitations
are canonical in
`docs/qa/latest/WAVE-4-PRODUCTION-RELEASE-QA.md`. Superseded integration-only
screenshots are not retained as the latest production record.
