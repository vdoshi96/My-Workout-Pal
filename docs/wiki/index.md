# Project wiki

Use the following documents as the maintained project map:

- `PRODUCT.md`: durable product truth.
- `docs/context/PROJECT.md`: scope, workflows, stack, and boundaries.
- `docs/context/STATUS.md`: verified state, active work, and blockers.
- `docs/context/DECISIONS.md`: architecture and product decisions with rationale.
- `docs/context/SOURCES.md`: source provenance and publication constraints.
- `docs/plans/PRODUCT-ARCHITECTURE.md`: application, data, security, and recovery design.
- `docs/plans/SURFACES.md`: route-by-route implementation plans and evidence requirements.
- `docs/plans/GUEST-LANDING-AND-CONTEXTUAL-NAVIGATION.md`: public welcome, optional account boundary, and origin-aware exercise navigation contract.
- `docs/plans/WORKOUT-COMPANION-REPOSITIONING.md`: sign-in handoff, flexible routines, personal home, library expansion, private guidance, copy, visual concept, worktree, and release plan.
- `docs/plans/FLEXIBLE-DAY-BUILDER.md`: Wave 1 editor interactions, chooser boundary, immutable publish and saved-day start flow, and focused evidence requirements.
- `docs/plans/LIBRARY-AND-PERSONAL-GUIDANCE.md`: Wave 1 chooser contract, catalog manifests, owner-scoped personal guidance, immutable snapshots, integration boundary, and verification record.
- `docs/plans/WAVE-1-INTEGRATION.md`: Wave 1 source provenance, integration contracts, migration order, combined acceptance criteria, and release stop boundary.
- `docs/plans/WAVE-1-PRODUCTION-RELEASE.md`: exact release identities, restore-tested recovery, ordered production migrations, hosted verification, and cleanup record.
- `docs/plans/WAVE-2-CATALOG-INTEGRATION.md`: Wave 2 source provenance, duplicate reconciliation, 134-record catalog contract, stable approved-video subset, verification matrix, and local-only release stop.
- `docs/plans/WAVE-2-PRODUCTION-RELEASE.md`: exact application and deployment
  identities, durable recovery, ordered production seed, hosted verification,
  Google authentication, cleanup, and repository closeout.
- `docs/plans/PERSONAL-HOME-AND-COMPANION-COPY.md`: Wave 1 public positioning, canonical Progress preview, personal signed-in home states, owner-scoped resume read, and verification plan.
- `docs/plans/NEON-CSRF-RESILIENCE.md`: idle Neon pool failure handling, privacy-safe diagnostics, regression coverage, and hosted release gate.
- `docs/plans/PROGRAM-COLLECTION.md`: owned-program creation, cloning, activation, authorization, recovery, and verification design.
- `docs/plans/VERIFICATION.md`: automated and manual release matrix.
- `docs/design/DIRECTION.md`: original visual world and interaction grammar.
- `docs/design/COMPANION-VISUAL-CONCEPTS.md`: selected Corner Companions responsive board, production guardrails, required corrections, and pilot acceptance criteria.
- `docs/design/PROGRAM-OVERVIEW.md`: approved comp and implementation inventory.
- `docs/reference/SUBSTITUTIONS.md`: equipment compatibility and program mutation rules.
- `docs/reference/EXERCISE-LIBRARY-EXPANSION.md`: original 108-name intake, reviewed duplicate resolution, 134-record catalog contract, video states, inventory, and content-agent workflow.
- `docs/reference/EXERCISE-LIBRARY-EXPANSION_grok.md`: the product owner's
  approved 216-link Grok 4.6 selection for the original 108-name intake, with
  visual-timeline and scoped-embed evidence; one intake name resolves as an
  alias, and runtime publication still requires recorded full-watch review.
- `docs/reference/YOUTUBE-CURATION.md`: discovery, review, seeding, and refresh policy.
- `docs/reference/DEPLOYMENT-RECOVERY.md`: environments, release checks, cost controls, and recovery.

Markdown files are canonical. Generated HTML counterparts support portable review and must remain in parity.

## Wave 2 production status

Application candidate `0ad06ef3821975d689015644be96f94f6b3b2dfa` and its
additive 134-exercise catalog are live on Ready production deployment
`dpl_DYxcb4ennqnstt8sFR2dkLXnomkn`. Durable recovery, deterministic seed and
replay, public and disposable-member hosted journeys, exact cleanup, direct
database invariants, and exact-deployment log filters are green. The 54 reviewed
approved-video rows remain byte-identical, and none of the 216 selected
candidate links entered runtime data.

Ordinary real production Continue with Google passed through connected Chrome,
returned safely to bounded `/app`, showed generic verified identity state, and
created no application data. Confirmed app sign-out returned to `/sign-in`, and
a direct `/app` revisit proved session absence. The direct owner audit found
zero rows for that Google identity and zero owner-scoped application rows
globally.

The final privacy-safe production QA report and generated HTML replace the
integration-only report and six synthetic screenshots in `docs/qa/latest`.
Clean completed Strength, Core/conditioning, video-eligibility, and integration
worktrees and local branches were removed while their GitHub provenance refs
remain. Only the active release worktree and checked-out local release branch
remain as the orchestrator's self-removal item. The production-release plan is
the authoritative execution record.

## Wave 1 released architecture

Released application commit `a202a815ad3b7320bbc68b819303822ca4773b1d`
composes library selection with routine placement while preserving the source
boundaries:

- `src/domain/exercises/movement-chooser-contract.ts` owns the neutral add, replace, and seed-day request plus the sanitized selection/error boundary.
- `src/components/program/program-editor.tsx` owns destination state, accessible ordering and removal review, publication recovery, and mapping the selection into the catalog/custom XOR.
- `src/components/program/program-editor-model.ts` owns immutable draft transformations, fresh opaque keys, defaults, same-kind retention, and cross-kind reset.
- `src/server/repositories/profile-program.ts` remains the owner-scoped publication authority and creates complete immutable revisions. Its existing onboarding transaction now accepts example or blank mode, includes the mode in the idempotency contract, and creates exactly one valid owned graph without a second persistence path.
- `drizzle/0006_program_cardio_display_order.sql` and `src/db/schema.ts` persist alternative cardio order explicitly; program reads, root clones, equipment revisions, and `src/server/repositories/workout-repository.ts` preserve it into the workout snapshot.
- `drizzle/0007_personal_guidance.sql` follows `0006`, owns owner-scoped personal guidance and guidance snapshots, and was regenerated against the integrated cardio-order schema state.

The editor mounts the library-owned chooser adapter without giving it ownership
of topology, targets, or publication. The library owns guidance persistence and
the workout repository snapshots guidance at start. Production migrations
`0006` and `0007` were restore-gated, applied, and verified in that order;
Ready deployment `dpl_8Crg9j6UD9K3aH7r6icePmcvLzzH` reports the exact released
Git source on the production aliases. The public, authenticated, password,
real-Google, and Wave 1 product replays passed, production returned to baseline,
and the 216 candidates remained unseeded. The full production report remains at
exact commit `b364d1987a8190a6d8bb92e7a8d7a64f077c0843` on
`origin/vishal/wave-1-production-release` and in Git history; the active latest
directory remains reserved for Wave 2. See the four Wave 1 plans and
`docs/context/DECISIONS.md` for the detailed contracts.
