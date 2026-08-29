# Catalog video eligibility contract plan

## Outcome

Let the canonical catalog grow with reviewed names-and-instructions records
without fabricating or requiring approved videos for text-only additions.
Preserve the released video boundary as exactly 27 declared canonical
variations and 54 approved rows, with two reviewed videos for every declared
variation. Do not encode a planned future catalog total in this contract.

This prerequisite changes no category manifest, catalog schema, database schema,
runtime seed row, approved video selection, production data, or deployment. It
creates one explicit policy source for video-required variations and makes every
default validator, curation target, database-row builder, and checker consume
that source.

## Ownership and source of truth

Add a small YouTube-domain policy module that explicitly lists the 27 released
canonical slugs whose `canonical` variation requires an approved pair. The list
is stable, reviewed, auditable, and independent of both the generated catalog
membership and the approved seed rows that it validates.

The contract has three separate sets:

- Canonical catalog membership comes from the eight generator-backed category
  manifests. A catalog record contains names, metadata, equipment, logging
  meaning, aliases, muscles, and exactly three instructions.
- Video-required membership comes from the explicit YouTube policy module. The
  default set remains 27 canonical variations until a separately reviewed
  curation change expands it.
- Approved video rows come from the checked-in schema-one seed manifest. The
  validator requires exactly two rows for every video-required variation and
  rejects rows outside the supplied required set.

The manifest schema does not gain content-status or video-status fields. The
catalog remains names-and-instructions data, while curation workflow state stays
in the curation lane.

## Navigation and presentation states

Public and member-library navigation continues to open the canonical exercise
detail route. A canonical record with an approved pair shows one validated
two-option player. A canonical record without an approved pair shows all written
instructions, an explicit unavailable state, and no iframe or placeholder
embed.

The workout runner continues to prefer an approved catalog pair, then an
immutable owner-guidance snapshot, then a truthful unavailable state. Missing
media never blocks exercise selection, routine publication, workout logging, or
history.

No route, navigation destination, public cache boundary, or service-worker entry
changes in this prerequisite.

## Types and validation

Keep `RequiredVideoVariation` as the policy value shape. The explicit policy
uses only stable canonical slugs and the durable `canonical` variation ID.
Default requirement construction validates that every declared slug still
exists in the runtime catalog, contains no duplicate key, and uses the expected
variation.

Production seed validation must fail closed for:

- A missing declared pair or any pair count other than two.
- A duplicate required mapping, video ID, or display order.
- An extra seed row outside the supplied required set.
- An unknown canonical slug or an unsupported equipment variation.
- An invalid video ID, order, title, channel, reviewer, or timestamp.
- A row that is pending, rejected, not fully watched, or contains forbidden
  candidate metadata.

A caller-supplied catalog support set may contain text-only canonical records,
but it cannot weaken or redefine the default 27-variation policy. Removing one
of the required catalog records or approved pairs still fails.

## Seed and persistence behavior

The database-neutral starter seed continues to construct one row for every
canonical catalog record. The relational row builder validates approved videos
against the catalog passed to that build and the independent video-required
policy. It always runs validation, including for an empty approved-row input.

For a synthetic text-only record, the row builder must create the catalog,
equipment, and alias rows with stable identities and preserve its instructions.
It must create no curated-video row for that record. The existing 27 required
variations still create exactly 54 byte-stable approved rows.

No migration is expected. If the implementation requires a schema change or
production mutation, stop and report the unexpected dependency.

## Authorization, privacy, and recovery

This change has no owner input, authentication, or authorization path. Existing
server-derived Firebase ownership, personal-guidance isolation, and immutable
workout snapshots remain unchanged.

The explicit policy contains only public canonical slugs. It contains no URLs,
provider credentials, private curation artifacts, reviewer identities, or owner
data. Approved rows retain their existing bounded public fields and full-watch
evidence.

Validation errors remain deterministic and identify only stable catalog or
variation keys. A failure stops seed construction or checking before a database
write. Re-running after a corrected manifest produces the same rows and IDs.

## Responsive behavior and accessibility

No layout or breakpoint behavior changes. Existing missing-video presentation
must keep semantic headings, useful text, and no empty focusable player. The
approved player keeps its existing keyboard, iframe-title, control, size,
referrer, and privacy-enhanced embed requirements.

Focused presentation checks cover the truthful unavailable state and confirm
that instructions remain visible without an iframe. Existing browser coverage
continues to cover phone and desktop exercise detail, member-library entry, and
runner logging.

## Test-driven implementation

Retain meaningful failed-before evidence from tests that express the uncoupled
contract before production code changes:

1. A synthetic text-only canonical row increases catalog rows without
   increasing required variations or approved rows.
2. An expanded synthetic catalog still has 27 required variations and 54
   approved rows, without coupling the contract to a future total.
3. Removing or corrupting one declared required pair fails validation and
   starter-row construction.
4. Unknown catalog slugs, noncanonical equipment variations, extra rows, and
   unreviewed rows fail.
5. Default YouTube targets cover the explicit video-required policy rather than
   every catalog record.
6. Public missing-video presentation retains written instructions and mounts no
   iframe; runner presentation remains truthful and logging stays available.

Update central count tests so catalog row count is derived independently from
the explicit assertions that the video-required subset is 27 and approved rows
are 54. Preserve released catalog order and metadata checks without freezing the
total catalog at 27.

## Verification and browser evidence

Run the following gates from the final branch, one large gate at a time:

- Focused catalog generator, metadata, filtering, starter seed and row,
  YouTube target, seed validation, seed manifest, presentation, repository, and
  bootstrap tests.
- Strict TypeScript and full ESLint.
- Full Vitest with exact file and assertion totals.
- Drizzle metadata, database bootstrap, and fixture checks.
- `pnpm seed:check`, which must report 27 required variations with exact-two
  coverage.
- PWA generation/check and Markdown/HTML documentation parity.
- Next.js 16.3.2 Webpack production build and route-boundary verification.
- Focused production-mode browser evidence for instructions, approved media,
  truthful unavailable media, and a usable logging path without an iframe.
- `git diff --check`, a category-manifest exclusion check, approved-seed hash
  comparison, and final clean-worktree audit.

Record local evidence only. Do not claim hosted or production proof.

## Acceptance criteria

- Canonical catalog membership and video-required membership have independent,
  explicit sources.
- The requirement set is not derived from approved rows, so removing a required
  pair fails closed.
- The existing reviewed subset remains exactly 27 canonical variations and the
  checked-in approved manifest remains exactly 54 rows.
- A catalog record outside the video-required set seeds and searches with
  instructions but receives no curated-video row or iframe.
- Catalog growth does not require more than the declared 27 pairs.
- Missing, duplicate, extra, unknown, unsupported-variation, pending,
  unreviewed, and incomplete rows remain rejected.
- The eight category manifests and all planned movement records remain
  untouched.
- No schema migration, production data mutation, curation approval, deployment,
  provider change, alias change, `main` merge, or sibling-worktree change occurs.
- The branch is committed and pushed as
  `vishal/catalog-video-eligibility-contract` with one exact handoff SHA.
