# Equipment substitutions

## Profiles

The dumbbell profile includes dumbbells, bodyweight, and an ordinary bench. The barbell profile includes a barbell, plates, a rack, a bench, dumbbells, and bodyweight.

Compatibility is derived from each exercise's required equipment. The program selector never marks a movement compatible because its name contains an equipment word.

## Starter days

### Push

Both profiles use the following prescriptions in order:

1. Dumbbell bench press.
2. Seated dumbbell shoulder press.
3. Incline dumbbell press.
4. Overhead dumbbell triceps extension.
5. Dead bug.
6. Front plank.

### Pull

The barbell profile uses the following prescriptions:

1. Barbell bent-over row.
2. One-arm dumbbell row.
3. Dumbbell pullover.
4. Dumbbell curl.
5. Bird dog.
6. Side plank.

The dumbbell profile replaces barbell bent-over row with chest-supported dumbbell row and retains the remaining order.

### Legs

Both profiles use the following prescriptions in order:

1. Goblet squat.
2. Dumbbell Romanian deadlift.
3. Reverse lunge.
4. Standing calf raise.
5. Plank shoulder tap.
6. Reverse crunch.

### Upper

The barbell profile uses the following prescriptions:

1. Barbell bench press.
2. Barbell bent-over row.
3. Seated dumbbell shoulder press.
4. One-arm dumbbell row.
5. Bicycle crunch.
6. Hollow hold.

The dumbbell profile replaces barbell bench press with dumbbell bench press and barbell bent-over row with chest-supported dumbbell row. It retains the remaining order.

### Lower

The barbell profile uses the following prescriptions:

1. Barbell back squat.
2. Barbell Romanian deadlift.
3. Bulgarian split squat.
4. Barbell hip thrust.
5. Dead bug.
6. Side plank.

The dumbbell profile uses the following prescriptions:

1. Heavy goblet squat, implemented as the canonical goblet squat with a prescription label and intent rather than a duplicate catalog exercise.
2. Dumbbell Romanian deadlift.
3. Bulgarian split squat.
4. Dumbbell hip thrust.
5. Dead bug.
6. Side plank.

The brief permits a weighted glute bridge as the fourth dumbbell movement. The initial seed chooses dumbbell hip thrust so the movement pattern stays closer to the barbell profile and the exercise name remains explicit.

## Substitution matrix

The following mappings apply in both directions when the target profile changes:

| Barbell variation | Dumbbell variation | Preserved | Cleared with explanation |
| --- | --- | --- | --- |
| Barbell bent-over row | Chest-supported dumbbell row | Sets, repetition range, rest, section, order, and general notes | Load target, movement-specific cue, and prior-value link |
| Barbell bench press | Dumbbell bench press | Sets, repetition range, rest, section, order, and general notes | Load target, movement-specific cue, and prior-value link |
| Barbell back squat | Goblet squat with heavy prescription label | Sets, repetition range, rest, section, order, and general notes | Load target, rack-specific cue, and prior-value link |
| Barbell Romanian deadlift | Dumbbell Romanian deadlift | Sets, repetition range, rest, section, order, and general notes | Load target, grip-specific cue, and prior-value link |
| Barbell hip thrust | Dumbbell hip thrust | Sets, repetition range, rest, section, order, and general notes | Load target, bar-pad cue, and prior-value link |

Unchanged movements retain all compatible prescription values. A custom movement that becomes incompatible has no automatic substitute. The confirmation flow requires the user to choose a compatible replacement, remove the prescription, or cancel.

## Mutation algorithm

1. Load the active program revision through the verified owner.
2. Derive compatibility from required equipment.
3. Map incompatible seeded variations through the matrix.
4. Classify every prescription field as preserved, cleared, or requiring user resolution.
5. Present the complete diff before mutation.
6. Validate confirmation against the base revision and proposed target profile.
7. Clone the revision, apply mappings and confirmed custom resolutions, and advance the active pointer in one transaction.
8. Keep prior revisions, workout snapshots, set logs, cardio logs, and analytics source rows unchanged.
9. Return the new revision ID and a summary that matches the confirmed diff.

## Acceptance criteria

- Both profiles produce five usable starter days with core and cardio.
- Every seeded mapping is reversible without duplicating canonical records.
- An equipment change mutates only the selected active program.
- Completed and active workout snapshots retain their original exercise and prescription meaning.
- General notes, sets, repetition ranges, rest, section, and order survive mapped substitutions.
- Incompatible targets are never silently copied.
- A stale or duplicate confirmation cannot create divergent revisions.
- Another user cannot preview or confirm substitutions for an owned program.
