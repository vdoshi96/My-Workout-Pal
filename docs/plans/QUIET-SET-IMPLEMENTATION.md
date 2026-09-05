# Quiet Set implementation and release

## Outcome and scope

Implement the September 4 companion comparison in My Workout Pal. Keep the product name, immutable training data, server ownership, and recovery engine. Replace the route-atlas presentation with porcelain, forest, sage, readable training numbers, and bounded Pip/Mica artwork. The user corrected the art direction during implementation: use expressive classic 2D theatrical cartoons in the Looney Tunes / Tom and Jerry tradition and a bright modern gym. Replace the rejected naturalistic animals and gloomy studio imagery throughout the asset family. The comparison remains a dated audit, not current product authority.

## Recommendation contracts

| Area | Implementation | Acceptance |
| --- | --- | --- |
| Setup | Separate navigation from final creation; detect time zone; retain input on error. | Continue cannot submit; final action is idempotent. |
| Empty routine | Keep an empty unpublished draft until actual movement selection. | No placeholder in a published routine; publication validates real content. |
| Navigation | Today, Routine, Progress; contextual Library and Settings utilities. | Start/resume takes priority; preserved URLs and return context. |
| Trial | Disposable guest set/rest interaction. | No server account writes; explicit reset and unsaved disclosure. |
| Runner | Current movement and inputs first; combined log/rest; explicit next set/movement. | First phone viewport contains logger; duplicate/retry cannot double-advance; recovery intact. |
| Routine | Plain save labels, contextual chooser, undo before save. | Saved, unsaved, saving, and failed states reflect actual persistence. |
| Progress | Completed work sets and reps; omit irrelevant zero metrics. | Ten bodyweight reps remain meaningful without invented load or duration. |
| Video truth | Reconcile inventory; modest labels, origin-aware embeds, single-demo fallback, problem reporting, variant notes. | Never infer human viewing from metadata or blanket approval fields; no blind reseed. |
| Visual system | Complete shared tokens, responsive surfaces, original environments, Pip/Mica, equipment and functional icons. | Reserved image dimensions, bounded assets, keyboard/focus/reflow/contrast, reduced motion and forced colors. |
| Maintenance | Repeatable metadata/duplicate/availability checks and targeted exceptions. | Read-only evidence checks never manufacture approval or silently mutate video data. |

Trainpal-specific defects are regression examples for the MWP implementation, not authorization to deploy another project. MWP already preserves unfinished History. The existing full-human-watch publication boundary remains binding: runtime presentation may support a single available demo, but this iteration cannot manufacture viewing evidence or publish unreviewed candidates. Any proposed policy relaxation must preserve truthful provenance.

## Data and failure behavior

Weight remains kilograms and distance meters. Firebase UID comes only from server verification. Existing published routines and session snapshots remain immutable. New draft types must be bounded and owner-scoped; use the smallest compatible storage extension necessary after inspecting the existing draft contract. No migration or seed runs merely for a visual change. Reconcile live video inventory without changing other applications' shared data.

Runner operations retain stable identities, pending/server-confirmed/error distinctions, local inputs, queue order, and deadline-based timers. A combined log/rest transition must use one domain action and reuse existing operation persistence. Completion waits for confirmation. Active-session edits retain their original snapshot. Account deletion and authorization contracts remain unchanged.

## Navigation, accessibility, and privacy

Keep existing routes usable. Contextual guide/chooser cancellation returns to the initiating routine position. Settings holds equipment, units, guidance, appearance, and account controls. Phone primary controls are at least 48 pixels and must not cover inputs or keyboard space. Desktop constrains the logger; zoom reflows to one column. Decorative artwork never communicates technique or save state, receives no focus, and is absent in forced colors and the active entry panel. Public caching excludes private data, guidance, and authenticated pages.

## Verification and release

Write failing domain tests before changing transformations. Run focused tests, then typecheck, lint, full unit/integration and database checks, seed policy, PWA parity, docs generation/check, production build, and route boundary. Exercise public and isolated member journeys on phone/desktop and Chromium/WebKit: trial, setup, empty routine, add/replace/cancel, weighted/bodyweight/timed/distance logging, rest, reload, offline/retry, interruption, history, progress, and settings. Retain concise red/green and browser evidence in `docs/qa/latest/` after replacement succeeds.

Push the feature branch, merge to main, synchronize local main, verify the exact Git-connected Vercel deployment and live origin, then run hosted public and disposable member checks with cleanup. Inspect deployment errors. Record actual limitations rather than claiming exhaustive physical-device or novice-user evidence. No real-participant study can be completed without participants; user authorization permits best-effort implementation with browser evidence and this explicit remaining research limitation.

Rollback uses the previous Ready deployment; immutable compatibility avoids historical rewrites. If a migration is necessary, document preflight and recovery before applying it. Keep the canonical checkout only; record any unresolved worktree. Update current docs and HTML counterparts together using `pnpm docs:build` and `pnpm docs:check`.

## Implementation decisions

Blank setup uses page-local draft state and asks for an actual compatible movement before the explicit final save. Refresh discards this unsaved setup. The existing routine editor can retain an empty draft after removal and undo that removal before saving; publication still requires valid training content. No database extension or migration is needed.

The runner combines logging and rest in one domain transition and retains stable operation keys. Next set and Next exercise remain explicit actions. Complete workout waits for pending saves. Native disclosures keep demonstrations and the outline accessible below or beside the logger. Progress adds actual work-set and repetition totals without inventing load or elapsed exercise time.

Companion preference is a versioned browser-local choice, including Off. Ready artwork also serves neutral states. Eight prompt-bearing cartoon masters produce ten optimized WebP assets; cream-backed character plates replace unreliable transparency. A shared vector component defines dumbbell, barbell, bench, mat, shoe, towel, timer, and distance-marker illustrations.

The canonical 268-item video inventory is reconciled read-only with production. Weekly metadata checks report exceptions; separate fields preserve the difference between metadata, playback, sampled review, full viewing, and editorial approval. Existing publication approval requirements remain unchanged.

See `docs/qa/latest/QUIET-SET-QA.md` for actual validation and release status.
