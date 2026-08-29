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
- `docs/plans/PERSONAL-HOME-AND-COMPANION-COPY.md`: Wave 1 public positioning, canonical Progress preview, personal signed-in home states, owner-scoped resume read, and verification plan.
- `docs/plans/NEON-CSRF-RESILIENCE.md`: idle Neon pool failure handling, privacy-safe diagnostics, regression coverage, and hosted release gate.
- `docs/plans/PROGRAM-COLLECTION.md`: owned-program creation, cloning, activation, authorization, recovery, and verification design.
- `docs/plans/VERIFICATION.md`: automated and manual release matrix.
- `docs/design/DIRECTION.md`: original visual world and interaction grammar.
- `docs/design/COMPANION-VISUAL-CONCEPTS.md`: selected Corner Companions responsive board, production guardrails, required corrections, and pilot acceptance criteria.
- `docs/design/PROGRAM-OVERVIEW.md`: approved comp and implementation inventory.
- `docs/reference/SUBSTITUTIONS.md`: equipment compatibility and program mutation rules.
- `docs/reference/EXERCISE-LIBRARY-EXPANSION.md`: names-first 135-movement target, metadata contract, video states, candidate inventory, and content-agent workflow.
- `docs/reference/EXERCISE-LIBRARY-EXPANSION_grok.md`: the product owner's approved 216-link Grok 4.6 selection for the 108 expansion movements, with visual-timeline and scoped-embed evidence; runtime publication still requires recorded full-watch review.
- `docs/reference/YOUTUBE-CURATION.md`: discovery, review, seeding, and refresh policy.
- `docs/reference/DEPLOYMENT-RECOVERY.md`: environments, release checks, cost controls, and recovery.

Markdown files are canonical. Generated HTML counterparts support portable review and must remain in parity.

## Wave 1 integrated architecture

The `vishal/wave-1-integration` candidate composes library selection with routine placement while preserving the source boundaries:

- `src/domain/exercises/movement-chooser-contract.ts` owns the neutral add, replace, and seed-day request plus the sanitized selection/error boundary.
- `src/components/program/program-editor.tsx` owns destination state, accessible ordering and removal review, publication recovery, and mapping the selection into the catalog/custom XOR.
- `src/components/program/program-editor-model.ts` owns immutable draft transformations, fresh opaque keys, defaults, same-kind retention, and cross-kind reset.
- `src/server/repositories/profile-program.ts` remains the owner-scoped publication authority and creates complete immutable revisions. Its existing onboarding transaction now accepts example or blank mode, includes the mode in the idempotency contract, and creates exactly one valid owned graph without a second persistence path.
- `drizzle/0006_program_cardio_display_order.sql` and `src/db/schema.ts` persist alternative cardio order explicitly; program reads, root clones, equipment revisions, and `src/server/repositories/workout-repository.ts` preserve it into the workout snapshot.
- `drizzle/0007_personal_guidance.sql` follows `0006`, owns owner-scoped personal guidance and guidance snapshots, and was regenerated against the integrated cardio-order schema state.

The editor mounts the library-owned chooser adapter without giving it ownership of topology, targets, or publication. The library owns guidance persistence and the workout repository snapshots guidance at start. Production migration application remains a separate schema-owner release action. See `docs/plans/FLEXIBLE-DAY-BUILDER.md`, `docs/plans/LIBRARY-AND-PERSONAL-GUIDANCE.md`, `docs/plans/PERSONAL-HOME-AND-COMPANION-COPY.md`, and `docs/context/DECISIONS.md` for the detailed contracts.
