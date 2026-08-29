# Flexible day-builder QA

## Result

Wave 1's flexible day-builder passes its local implementation gate from baseline `4622f9e1b7783fd35cb6c23ae9396148c7c3357a` on branch `vishal/flexible-day-builder`.

A synthetic verified owner can add, replace, review removal of, and reorder movements; add, rename, review removal of, and reorder optional sections; add, remove, configure, and reorder zero to two cardio alternatives; publish a complete immutable revision; reload the saved arbitrary-name day; and start that exact revision. Stable opaque day, section, prescription, and cardio keys survive publication and an equipment revision. Earlier workout history remains unchanged.

This is local production-mode fixture evidence. It is not a deployment, hosted-authentication result, production migration application, or release approval.

## Integrated boundaries

- Wave 0 source baseline: `4622f9e1b7783fd35cb6c23ae9396148c7c3357a`.
- Neutral chooser checkpoint: `5255a5254fcde4c1b1558947bda64d47bad23743`, cherry-picked as `2436bac`.
- Chooser intents are exactly `add`, `replace`, and `seed-day`; only replacement carries `currentSelection`.
- The selection contains only catalog-or-custom source identity, name, and logging kind. Name and logging kind are interface/default hints; publication revalidates server authority.
- Guidance, owner identifiers, route identifiers, private URLs, targets, and topology keys do not enter the chooser selection.
- Migration `0006_program_cardio_display_order` stores authored cardio order for owned program revisions. It was generated and tested locally but was not applied to production.

## Retained test-driven evidence

The implementation retained these meaningful failed-before results:

- `tests/unit/program-editor-model.test.ts`: two failures and 15 passes before `reorderProgramCardio` and reviewed prescription removal existed.
- `tests/integration/profile-program-repository.test.ts` plus `tests/unit/flexible-routine-publication.test.ts`: two failures and 21 passes because a saved `[runner, walker]` order reloaded as `[walker, runner]` and zero-distance cardio was accepted.
- The cardio-default assertion failed because both new choices used one second and the saved-day page rounded them to zero minutes.

The corresponding passed-after evidence is:

- Focused chooser, editor, publication, migration, profile/program, and workout matrix: 6 files and 64 tests passed.
- Migration-impact matrix across schema, profile/program, workout, program collection, training insights, account deletion, and reconciliation: 8 files and 83 tests passed.
- Complete permission-correct Vitest run: 109 files and 747 tests passed in 109.18 seconds.

## Static and build verification

- Strict TypeScript: passed.
- Full ESLint: passed.
- Drizzle migration metadata: passed.
- Seed validation: all 27 required variations retain exactly two approved videos.
- Generated service worker: verified.
- Documentation generation and parity: passed for the complete maintained publication set.
- Next.js 16.3.2 Webpack production build: passed.
- Production route boundary: passed with 41 App Router entries and no authenticated fixture route.

## Authenticated browser journey

Command:

```text
node scripts/test-e2e-authenticated.mjs -- tests/authenticated-e2e/flexible-routine-publication.spec.ts --project=chromium-desktop --project=webkit-phone
```

Final result: two tests passed in 29.2 seconds.

- Chromium desktop: passed in 10.1 seconds.
- WebKit phone: passed in 17.7 seconds.

The journey used arbitrary names (`Mobility reset`, `Tempo drills`, and `Trunk check`) and did not assume five days, mandatory Core, or a fixed cardio pair. It exercised cancel and confirm paths for movement and section removal, verified focus restoration, published `[Runner, Walker]`, reloaded both choices at 20 minutes, checked stable keys, started the saved day, preserved those keys through a barbell equipment revision, resumed the immutable pre-equipment workout snapshot, completed the selected Runner finish, and re-opened pre-edit history unchanged. Serious and critical Axe findings, horizontal overflow, unexpected console/page failures, and first-party request failures were absent.

## Visual review

All retained frames contain synthetic fixture data only.

- [Chromium desktop editor](./flexible-day-builder-editor-chromium-desktop.png)
- [WebKit phone editor](./flexible-day-builder-editor-webkit-phone.png)
- [WebKit phone saved day](./flexible-day-builder-saved-day-webkit-phone.png)
- [Chromium desktop immutable runner](./flexible-day-builder-runner-chromium-desktop.png)

The desktop editor keeps its outline and selected day legible, while the phone editor places every action in document order without horizontal clipping. The saved-day phone frame preserves arbitrary section names and authored Runner-then-Walker order. The desktop runner identifies the exact revision and shows both cardio alternatives in the immutable snapshot.

## Release and integration requirements

- Merge this branch only after reconciling Wave 1 sibling branches and the shared documentation index.
- Apply migration `0006_program_cardio_display_order` only through the separately reviewed schema-owner release sequence.
- Preserve the neutral chooser contract module when the library implementation lands; do not reintroduce the removed component-local adapter.
- Do not treat this packet as hosted Firebase, Neon production, deployment, or production smoke evidence.
