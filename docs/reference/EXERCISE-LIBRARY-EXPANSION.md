# Exercise library expansion inventory

## Purpose

This inventory defines the names-first expansion for My Workout Pal. It lets catalog and curation agents work from one bounded specification without inventing movement names, publishing unreviewed videos, or treating the five-day starter as the whole library.

The existing 27 canonical movements remain the verified baseline. The following 108 candidates would bring the public canonical library to 135 movements before any later equipment-taxonomy expansion. A movement is not ready for production merely because it appears in this document. The product owner's approved Grok 4.6 URL selections are in [`EXERCISE-LIBRARY-EXPANSION_grok.md`](EXERCISE-LIBRARY-EXPANSION_grok.md). Those URLs do not need another selection pass, but runtime video publication still requires the recorded full-watch evidence defined by the curation policy.

## Publication contract

Every production catalog record must contain:

- A unique stable slug and display name.
- One logging kind: `weight_reps`, `bodyweight_reps`, `duration`, or `distance_duration`.
- One or more existing equipment IDs: `bodyweight`, `dumbbells`, `barbell`, `plates`, `bench`, or `rack`.
- A movement family, primary muscles, search aliases, and three concise form instructions.
- A content-review status and reviewer evidence for name, equipment, logging meaning, instructions, and duplicate detection.
- A video status: `not_started`, `in_review`, `approved_pair`, or `unavailable`.

An `approved_pair` requires exactly two unique, eligible, fully watched demonstrations under the existing YouTube curation policy. `not_started`, `in_review`, and `unavailable` records still provide useful names and instructions, but render no empty or unapproved catalog player.

Do not add a new equipment category in this batch. Bands, cables, kettlebells, pull-up bars, suspension trainers, machines, medicine balls, and cardio machines require their own equipment-profile and compatibility plan.

## Candidate status

Every entry in the following tables has this initial state:

- Content status: `candidate`.
- Video status: `not_started`.
- Approved video IDs: none.
- Production eligibility: false until metadata, instructions, duplicates, tests, and seed output pass review.

### Chest and pushing

| Slug | Display name | Logging kind | Required equipment |
| --- | --- | --- | --- |
| `push-up` | Push-up | `bodyweight_reps` | bodyweight |
| `incline-push-up` | Incline push-up | `bodyweight_reps` | bodyweight, bench |
| `decline-push-up` | Decline push-up | `bodyweight_reps` | bodyweight, bench |
| `close-grip-push-up` | Close-grip push-up | `bodyweight_reps` | bodyweight |
| `diamond-push-up` | Diamond push-up | `bodyweight_reps` | bodyweight |
| `dumbbell-floor-press` | Dumbbell floor press | `weight_reps` | dumbbells |
| `dumbbell-squeeze-press` | Dumbbell squeeze press | `weight_reps` | dumbbells, bench |
| `dumbbell-chest-fly` | Dumbbell chest fly | `weight_reps` | dumbbells, bench |
| `incline-dumbbell-fly` | Incline dumbbell fly | `weight_reps` | dumbbells, bench |
| `incline-barbell-bench-press` | Incline barbell bench press | `weight_reps` | barbell, plates, bench, rack |
| `close-grip-barbell-bench-press` | Close-grip barbell bench press | `weight_reps` | barbell, plates, bench, rack |
| `barbell-floor-press` | Barbell floor press | `weight_reps` | barbell, plates, rack |

### Back and rear shoulder

| Slug | Display name | Logging kind | Required equipment |
| --- | --- | --- | --- |
| `pendlay-row` | Pendlay row | `weight_reps` | barbell, plates |
| `underhand-barbell-row` | Underhand barbell row | `weight_reps` | barbell, plates |
| `dumbbell-renegade-row` | Dumbbell renegade row | `weight_reps` | dumbbells |
| `dumbbell-reverse-fly` | Dumbbell reverse fly | `weight_reps` | dumbbells |
| `dumbbell-rear-delt-row` | Dumbbell rear-delt row | `weight_reps` | dumbbells |
| `barbell-shrug` | Barbell shrug | `weight_reps` | barbell, plates |
| `dumbbell-shrug` | Dumbbell shrug | `weight_reps` | dumbbells |
| `inverted-row` | Inverted row | `bodyweight_reps` | bodyweight, barbell, rack |
| `prone-dumbbell-row` | Prone dumbbell row | `weight_reps` | dumbbells, bench |
| `dumbbell-dead-row` | Dumbbell dead row | `weight_reps` | dumbbells |
| `barbell-rack-pull` | Barbell rack pull | `weight_reps` | barbell, plates, rack |
| `dumbbell-high-pull` | Dumbbell high pull | `weight_reps` | dumbbells |

### Shoulders

| Slug | Display name | Logging kind | Required equipment |
| --- | --- | --- | --- |
| `standing-dumbbell-shoulder-press` | Standing dumbbell shoulder press | `weight_reps` | dumbbells |
| `arnold-press` | Arnold press | `weight_reps` | dumbbells, bench |
| `dumbbell-lateral-raise` | Dumbbell lateral raise | `weight_reps` | dumbbells |
| `leaning-dumbbell-lateral-raise` | Leaning dumbbell lateral raise | `weight_reps` | dumbbells, rack |
| `dumbbell-front-raise` | Dumbbell front raise | `weight_reps` | dumbbells |
| `barbell-overhead-press` | Barbell overhead press | `weight_reps` | barbell, plates, rack |
| `barbell-push-press` | Barbell push press | `weight_reps` | barbell, plates, rack |
| `dumbbell-z-press` | Dumbbell Z press | `weight_reps` | dumbbells |
| `dumbbell-upright-row` | Dumbbell upright row | `weight_reps` | dumbbells |
| `barbell-upright-row` | Barbell upright row | `weight_reps` | barbell, plates |

### Arms

| Slug | Display name | Logging kind | Required equipment |
| --- | --- | --- | --- |
| `hammer-curl` | Hammer curl | `weight_reps` | dumbbells |
| `cross-body-hammer-curl` | Cross-body hammer curl | `weight_reps` | dumbbells |
| `incline-dumbbell-curl` | Incline dumbbell curl | `weight_reps` | dumbbells, bench |
| `concentration-curl` | Concentration curl | `weight_reps` | dumbbells, bench |
| `barbell-curl` | Barbell curl | `weight_reps` | barbell, plates |
| `reverse-barbell-curl` | Reverse barbell curl | `weight_reps` | barbell, plates |
| `lying-dumbbell-triceps-extension` | Lying dumbbell triceps extension | `weight_reps` | dumbbells, bench |
| `barbell-skull-crusher` | Barbell skull crusher | `weight_reps` | barbell, plates, bench |
| `dumbbell-triceps-kickback` | Dumbbell triceps kickback | `weight_reps` | dumbbells, bench |
| `bench-dip` | Bench dip | `bodyweight_reps` | bodyweight, bench |
| `close-grip-dumbbell-press` | Close-grip dumbbell press | `weight_reps` | dumbbells, bench |
| `barbell-jm-press` | Barbell JM press | `weight_reps` | barbell, plates, bench, rack |

### Lower body and glutes

| Slug | Display name | Logging kind | Required equipment |
| --- | --- | --- | --- |
| `barbell-front-squat` | Barbell front squat | `weight_reps` | barbell, plates, rack |
| `zercher-squat` | Zercher squat | `weight_reps` | barbell, plates, rack |
| `sumo-goblet-squat` | Sumo goblet squat | `weight_reps` | dumbbells |
| `dumbbell-split-squat` | Dumbbell split squat | `weight_reps` | dumbbells |
| `forward-lunge` | Forward lunge | `weight_reps` | dumbbells |
| `walking-lunge` | Walking lunge | `weight_reps` | dumbbells |
| `lateral-lunge` | Lateral lunge | `weight_reps` | dumbbells |
| `dumbbell-step-up` | Dumbbell step-up | `weight_reps` | dumbbells, bench |
| `lateral-step-up` | Lateral step-up | `weight_reps` | dumbbells, bench |
| `single-leg-dumbbell-romanian-deadlift` | Single-leg dumbbell Romanian deadlift | `weight_reps` | dumbbells |
| `dumbbell-stiff-leg-deadlift` | Dumbbell stiff-leg deadlift | `weight_reps` | dumbbells |
| `conventional-barbell-deadlift` | Conventional barbell deadlift | `weight_reps` | barbell, plates |
| `sumo-barbell-deadlift` | Sumo barbell deadlift | `weight_reps` | barbell, plates |
| `barbell-good-morning` | Barbell good morning | `weight_reps` | barbell, plates, rack |
| `bodyweight-glute-bridge` | Bodyweight glute bridge | `bodyweight_reps` | bodyweight |
| `single-leg-glute-bridge` | Single-leg glute bridge | `bodyweight_reps` | bodyweight |
| `frog-pump` | Frog pump | `bodyweight_reps` | bodyweight |
| `seated-dumbbell-calf-raise` | Seated dumbbell calf raise | `weight_reps` | dumbbells, bench |
| `single-leg-calf-raise` | Single-leg calf raise | `bodyweight_reps` | bodyweight |
| `wall-sit` | Wall sit | `duration` | bodyweight |

### Core

| Slug | Display name | Logging kind | Required equipment |
| --- | --- | --- | --- |
| `crunch` | Crunch | `bodyweight_reps` | bodyweight |
| `sit-up` | Sit-up | `bodyweight_reps` | bodyweight |
| `heel-tap` | Heel tap | `bodyweight_reps` | bodyweight |
| `toe-touch` | Toe touch | `bodyweight_reps` | bodyweight |
| `lying-leg-raise` | Lying leg raise | `bodyweight_reps` | bodyweight |
| `bent-knee-leg-raise` | Bent-knee leg raise | `bodyweight_reps` | bodyweight |
| `flutter-kick` | Flutter kick | `duration` | bodyweight |
| `scissor-kick` | Scissor kick | `duration` | bodyweight |
| `mountain-climber` | Mountain climber | `bodyweight_reps` | bodyweight |
| `cross-body-mountain-climber` | Cross-body mountain climber | `bodyweight_reps` | bodyweight |
| `russian-twist` | Russian twist | `bodyweight_reps` | bodyweight |
| `v-up` | V-up | `bodyweight_reps` | bodyweight |
| `tuck-up` | Tuck-up | `bodyweight_reps` | bodyweight |
| `superman-hold` | Superman hold | `duration` | bodyweight |
| `bear-plank` | Bear plank | `duration` | bodyweight |
| `plank-up-down` | Plank up-down | `bodyweight_reps` | bodyweight |
| `side-plank-reach-through` | Side plank reach-through | `bodyweight_reps` | bodyweight |
| `dead-bug-heel-tap` | Dead bug heel tap | `bodyweight_reps` | bodyweight |

### Conditioning and carries

| Slug | Display name | Logging kind | Required equipment |
| --- | --- | --- | --- |
| `burpee` | Burpee | `bodyweight_reps` | bodyweight |
| `squat-thrust` | Squat thrust | `bodyweight_reps` | bodyweight |
| `jumping-jack` | Jumping jack | `duration` | bodyweight |
| `high-knees` | High knees | `duration` | bodyweight |
| `skater-hop` | Skater hop | `bodyweight_reps` | bodyweight |
| `dumbbell-thruster` | Dumbbell thruster | `weight_reps` | dumbbells |
| `dumbbell-clean` | Dumbbell clean | `weight_reps` | dumbbells |
| `dumbbell-clean-and-press` | Dumbbell clean and press | `weight_reps` | dumbbells |
| `dumbbell-snatch` | Dumbbell snatch | `weight_reps` | dumbbells |
| `dumbbell-farmer-carry` | Dumbbell farmer carry | `distance_duration` | dumbbells |
| `dumbbell-suitcase-carry` | Dumbbell suitcase carry | `distance_duration` | dumbbells |
| `dumbbell-front-rack-carry` | Dumbbell front-rack carry | `distance_duration` | dumbbells |
| `bear-crawl` | Bear crawl | `distance_duration` | bodyweight |
| `reverse-bear-crawl` | Reverse bear crawl | `distance_duration` | bodyweight |

### Mobility and recovery

| Slug | Display name | Logging kind | Required equipment |
| --- | --- | --- | --- |
| `cat-cow` | Cat-cow | `bodyweight_reps` | bodyweight |
| `childs-pose` | Child's pose | `duration` | bodyweight |
| `half-kneeling-thoracic-rotation` | Half-kneeling thoracic rotation | `bodyweight_reps` | bodyweight |
| `kneeling-hip-flexor-stretch` | Kneeling hip flexor stretch | `duration` | bodyweight |
| `seated-hamstring-stretch` | Seated hamstring stretch | `duration` | bodyweight |
| `ninety-ninety-hip-switch` | 90/90 hip switch | `bodyweight_reps` | bodyweight |
| `figure-four-stretch` | Figure-four stretch | `duration` | bodyweight |
| `standing-calf-stretch` | Standing calf stretch | `duration` | bodyweight |
| `shoulder-wall-slide` | Shoulder wall slide | `bodyweight_reps` | bodyweight |
| `prone-cobra` | Prone cobra | `duration` | bodyweight |

## Agent workflow

The catalog-foundation agent first moves the canonical source into generator-backed category manifests. Each content agent then owns one isolated category file and its tests.

For every candidate, the content agent must:

1. Confirm that the movement is distinct from an existing canonical record and record intentional aliases instead of creating duplicates.
2. Confirm that the required equipment fits the existing equipment model.
3. Confirm that the logging kind matches what the runner can record without reinterpretation.
4. Write concise instructions that describe setup, controlled execution, and a clear stopping condition without medical or outcome claims.
5. Add movement family, primary muscles, aliases, and compatibility tests.
6. Generate deterministic catalog and seed output.
7. Verify public and member-library search, detail, and routine-chooser behavior.
8. Leave video status truthful. Do not add an arbitrary video to satisfy a count.

The video-research agent works later from the private curation checkpoint. It can propose exact movement-variation candidates and fill research evidence, but only a human full-watch review can approve a pair for the production seed.

## Acceptance criteria

- The generated catalog contains 135 unique stable slugs after all candidates pass review.
- Every record has complete searchable metadata and exactly three reviewed instructions.
- The library and routine chooser render entries without an approved pair and clearly distinguish app-approved demonstrations from owner-provided links.
- Existing 54 approved starter videos retain their exact validated mappings.
- Catalog generation, seed generation, documentation, and search output are deterministic.
- Representative entries from every category can be added to an owned routine, published, started, logged, and read from immutable history.
- No candidate adds an undeclared equipment category, public owner link, unreviewed catalog embed, or medical claim.
