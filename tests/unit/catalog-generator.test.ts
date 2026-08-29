import { describe, expect, it } from "vitest";

import {
  generateCatalog,
  normalizeCatalogAlias,
  type CatalogManifestInput,
  type CatalogManifestRecord,
} from "@/domain/exercises/catalog-generator";
import { CATALOG_EXERCISES } from "@/domain/exercises/catalog";
import {
  CATALOG_MANIFESTS,
  CATALOG_MANIFEST_RECORDS,
} from "@/domain/exercises/catalog-manifests";

const validRecord = (): CatalogManifestRecord => ({
  slug: "test-movement",
  name: "Test movement",
  role: "compound",
  loggingKind: "weight_reps",
  requiredEquipment: ["dumbbells"],
  movementFamily: "test-family",
  primaryMuscles: ["upper back"],
  aliases: ["Test move", "test variation"],
  instructions: [
    "Set a stable starting position.",
    "Move the load under control.",
    "Return to the start before the position changes.",
  ],
});

type ReleasedCatalogSnapshot = readonly [
  string,
  string,
  string,
  string,
  readonly string[],
  string,
  readonly string[],
  readonly string[],
  readonly string[],
];

const releasedCatalogSnapshot: readonly ReleasedCatalogSnapshot[] = [
  [
    "dumbbell-bench-press",
    "Dumbbell bench press",
    "compound",
    "weight_reps",
    ["dumbbells", "bench"],
    "bench-press",
    ["pecs", "triceps", "front deltoids"],
    ["DB bench press", "dumbbell chest press"],
    [
      "Set a stable bench position with both feet planted.",
      "Lower the weight toward the mid-chest under control.",
      "Press along the same path and finish each repetition balanced.",
    ],
  ],
  [
    "seated-dumbbell-shoulder-press",
    "Seated dumbbell shoulder press",
    "compound",
    "weight_reps",
    ["dumbbells", "bench"],
    "shoulder-press",
    ["deltoids", "triceps"],
    ["seated DB press", "dumbbell overhead press"],
    [
      "Sit against an upright bench with both feet planted.",
      "Start with the weights near shoulder height and wrists stacked.",
      "Press overhead smoothly, then return to the start under control.",
    ],
  ],
  [
    "incline-dumbbell-press",
    "Incline dumbbell press",
    "compound",
    "weight_reps",
    ["dumbbells", "bench"],
    "incline-press",
    ["upper pecs", "front deltoids", "triceps"],
    ["incline DB bench", "incline chest press"],
    [
      "Set the bench to a modest incline and plant both feet.",
      "Lower the weights beside the upper chest without bouncing.",
      "Press along the same path and keep the shoulders supported.",
    ],
  ],
  [
    "overhead-dumbbell-triceps-extension",
    "Overhead dumbbell triceps extension",
    "accessory",
    "weight_reps",
    ["dumbbells"],
    "overhead-triceps-extension",
    ["triceps"],
    ["DB overhead extension", "dumbbell French press"],
    [
      "Hold the dumbbell securely above the head.",
      "Keep the upper arms steady while lowering behind the head.",
      "Extend the elbows smoothly and stop before control changes.",
    ],
  ],
  [
    "dead-bug",
    "Dead bug",
    "core-reps",
    "bodyweight_reps",
    ["bodyweight"],
    "dead-bug",
    ["core", "hip flexors"],
    ["alternating dead bug", "opposite arm leg lower"],
    [
      "Lie on the back with arms up and knees over the hips.",
      "Lower one arm and the opposite leg without rushing.",
      "Return to the start and alternate while the torso stays steady.",
    ],
  ],
  [
    "front-plank",
    "Front plank",
    "core-timed",
    "duration",
    ["bodyweight"],
    "front-plank",
    ["core", "glutes", "shoulders"],
    ["prone plank", "plank hold"],
    [
      "Place the forearms under the shoulders and extend both legs.",
      "Form one long line from head through heels.",
      "Breathe steadily and end the hold before position changes.",
    ],
  ],
  [
    "barbell-bent-over-row",
    "Barbell bent-over row",
    "compound",
    "weight_reps",
    ["barbell", "plates"],
    "horizontal-row",
    ["lats", "upper back", "biceps"],
    ["barbell row", "bent row"],
    [
      "Set a stable torso position before starting the pull.",
      "Row the weight toward the ribs without using momentum.",
      "Lower to a controlled reach while keeping the setup steady.",
    ],
  ],
  [
    "one-arm-dumbbell-row",
    "One-arm dumbbell row",
    "compound",
    "weight_reps",
    ["dumbbells", "bench"],
    "one-arm-row",
    ["lats", "upper back", "biceps"],
    ["single-arm dumbbell row", "one-arm DB row"],
    [
      "Support one hand on the bench and set a stable stance.",
      "Pull the dumbbell toward the hip while the torso stays quiet.",
      "Lower to a controlled reach, finish the side, then switch.",
    ],
  ],
  [
    "dumbbell-pullover",
    "Dumbbell pullover",
    "accessory",
    "weight_reps",
    ["dumbbells", "bench"],
    "pullover",
    ["lats", "pecs", "triceps"],
    ["DB pullover", "bench pullover"],
    [
      "Lie securely on the bench and hold the dumbbell above the chest.",
      "Move the weight in an arc with softly bent elbows.",
      "Reverse the arc under control at the end of the chosen range.",
    ],
  ],
  [
    "dumbbell-curl",
    "Dumbbell curl",
    "accessory",
    "weight_reps",
    ["dumbbells"],
    "biceps-curl",
    ["biceps", "forearms"],
    ["DB biceps curl", "alternating dumbbell curl"],
    [
      "Stand tall with a dumbbell at each side.",
      "Curl without swinging or driving the elbows forward.",
      "Lower each weight to the start under control.",
    ],
  ],
  [
    "bird-dog",
    "Bird dog",
    "core-reps",
    "bodyweight_reps",
    ["bodyweight"],
    "bird-dog",
    ["core", "glutes", "upper back"],
    ["quadruped reach", "opposite arm leg reach"],
    [
      "Start on hands and knees with hands under shoulders.",
      "Reach one arm and the opposite leg away from the body.",
      "Return without shifting the torso, then alternate sides.",
    ],
  ],
  [
    "side-plank",
    "Side plank",
    "core-timed",
    "duration",
    ["bodyweight"],
    "side-plank",
    ["obliques", "glutes", "shoulders"],
    ["lateral plank", "side plank hold"],
    [
      "Place one forearm under the shoulder and set the feet.",
      "Lift the hips into a straight line from head to feet.",
      "Hold with steady breathing, then repeat on the other side.",
    ],
  ],
  [
    "chest-supported-dumbbell-row",
    "Chest-supported dumbbell row",
    "compound",
    "weight_reps",
    ["dumbbells", "bench"],
    "horizontal-row",
    ["lats", "upper back", "biceps"],
    ["incline bench dumbbell row", "chest-supported DB row"],
    [
      "Set a stable torso position before starting the pull.",
      "Row the weight toward the ribs without using momentum.",
      "Lower to a controlled reach while keeping the setup steady.",
    ],
  ],
  [
    "goblet-squat",
    "Goblet squat",
    "compound",
    "weight_reps",
    ["dumbbells"],
    "squat",
    ["quads", "glutes", "adductors"],
    ["dumbbell goblet squat", "cup squat"],
    [
      "Set a balanced stance with the whole foot planted.",
      "Descend between the hips while keeping the load controlled.",
      "Stand smoothly and finish each repetition balanced.",
    ],
  ],
  [
    "dumbbell-romanian-deadlift",
    "Dumbbell Romanian deadlift",
    "compound",
    "weight_reps",
    ["dumbbells"],
    "romanian-deadlift",
    ["hamstrings", "glutes", "upper back"],
    ["dumbbell RDL", "DB Romanian deadlift"],
    [
      "Start tall with the load close and knees softly bent.",
      "Push the hips back while keeping the weight near the legs.",
      "Reverse the hinge to stand without turning it into a squat.",
    ],
  ],
  [
    "reverse-lunge",
    "Reverse lunge",
    "compound",
    "weight_reps",
    ["dumbbells"],
    "lunge",
    ["quads", "glutes", "adductors"],
    ["backward lunge", "dumbbell reverse lunge"],
    [
      "Stand tall with the dumbbells at the sides.",
      "Step back and lower with control over the front leg.",
      "Push through the front foot to return, then repeat or alternate.",
    ],
  ],
  [
    "standing-calf-raise",
    "Standing calf raise",
    "accessory",
    "weight_reps",
    ["dumbbells"],
    "calf-raise",
    ["calves"],
    ["dumbbell calf raise", "standing heel raise"],
    [
      "Stand balanced with the weights at the sides.",
      "Rise onto the balls of the feet without rocking forward.",
      "Pause at the top and lower the heels slowly.",
    ],
  ],
  [
    "plank-shoulder-tap",
    "Plank shoulder tap",
    "core-reps",
    "bodyweight_reps",
    ["bodyweight"],
    "shoulder-tap",
    ["core", "shoulders", "triceps"],
    ["high plank shoulder tap", "plank taps"],
    [
      "Start in a high plank with a stable foot position.",
      "Lift one hand to tap the opposite shoulder.",
      "Replace the hand and alternate while limiting torso rotation.",
    ],
  ],
  [
    "reverse-crunch",
    "Reverse crunch",
    "core-reps",
    "bodyweight_reps",
    ["bodyweight"],
    "reverse-crunch",
    ["core", "hip flexors"],
    ["lying reverse crunch", "knee tuck crunch"],
    [
      "Lie on the back with knees bent and feet lifted.",
      "Bring the knees toward the torso with a small controlled curl.",
      "Lower until the pelvis returns without using momentum.",
    ],
  ],
  [
    "barbell-bench-press",
    "Barbell bench press",
    "compound",
    "weight_reps",
    ["barbell", "plates", "bench", "rack"],
    "bench-press",
    ["pecs", "triceps", "front deltoids"],
    ["bench press", "flat barbell bench"],
    [
      "Set a stable bench position with both feet planted.",
      "Lower the weight toward the mid-chest under control.",
      "Press along the same path and finish each repetition balanced.",
    ],
  ],
  [
    "bicycle-crunch",
    "Bicycle crunch",
    "core-reps",
    "bodyweight_reps",
    ["bodyweight"],
    "bicycle-crunch",
    ["core", "obliques", "hip flexors"],
    ["bicycle abs", "alternating elbow knee crunch"],
    [
      "Lie on the back with hands lightly supporting the head.",
      "Rotate one shoulder toward the opposite bent knee.",
      "Alternate sides at a controlled pace without pulling the head.",
    ],
  ],
  [
    "hollow-hold",
    "Hollow hold",
    "core-timed",
    "duration",
    ["bodyweight"],
    "hollow-hold",
    ["core", "hip flexors"],
    ["hollow body hold", "dish hold"],
    [
      "Lie on the back and lift the shoulders and bent legs.",
      "Reach farther only while the torso stays steady.",
      "Hold with even breathing and use a tucked shape when needed.",
    ],
  ],
  [
    "barbell-back-squat",
    "Barbell back squat",
    "compound",
    "weight_reps",
    ["barbell", "plates", "rack"],
    "squat",
    ["quads", "glutes", "adductors"],
    ["back squat", "rack squat"],
    [
      "Set a balanced stance with the whole foot planted.",
      "Descend between the hips while keeping the load controlled.",
      "Stand smoothly and finish each repetition balanced.",
    ],
  ],
  [
    "barbell-romanian-deadlift",
    "Barbell Romanian deadlift",
    "compound",
    "weight_reps",
    ["barbell", "plates"],
    "romanian-deadlift",
    ["hamstrings", "glutes", "upper back"],
    ["barbell RDL", "Romanian deadlift"],
    [
      "Start tall with the load close and knees softly bent.",
      "Push the hips back while keeping the weight near the legs.",
      "Reverse the hinge to stand without turning it into a squat.",
    ],
  ],
  [
    "bulgarian-split-squat",
    "Bulgarian split squat",
    "compound",
    "weight_reps",
    ["dumbbells", "bench"],
    "split-squat",
    ["quads", "glutes", "adductors"],
    ["rear-foot-elevated split squat", "RFESS"],
    [
      "Set the rear foot on the bench and stabilize the front foot.",
      "Lower through the front leg while keeping balance over the stance.",
      "Stand through the front foot, finish the side, then switch.",
    ],
  ],
  [
    "barbell-hip-thrust",
    "Barbell hip thrust",
    "compound",
    "weight_reps",
    ["barbell", "plates", "bench"],
    "hip-thrust",
    ["glutes", "hamstrings"],
    ["barbell glute bridge", "bench hip thrust"],
    [
      "Set the upper back against the bench and secure the load at the hips.",
      "Drive through the planted feet to lift the hips.",
      "Pause at a level top position, then lower under control.",
    ],
  ],
  [
    "dumbbell-hip-thrust",
    "Dumbbell hip thrust",
    "compound",
    "weight_reps",
    ["dumbbells", "bench"],
    "hip-thrust",
    ["glutes", "hamstrings"],
    ["weighted glute bridge", "dumbbell glute bridge"],
    [
      "Set the upper back against the bench and secure the load at the hips.",
      "Drive through the planted feet to lift the hips.",
      "Pause at a level top position, then lower under control.",
    ],
  ],
] as const;

describe("canonical catalog generator", () => {
  it("keeps the released source split across the eight expansion categories", () => {
    expect(CATALOG_MANIFESTS.map(({ category }) => category)).toEqual([
      "chest-and-pushing",
      "back-and-rear-shoulder",
      "shoulders",
      "arms",
      "lower-body-and-glutes",
      "core",
      "conditioning-and-carries",
      "mobility-and-recovery",
    ]);
    expect(CATALOG_MANIFEST_RECORDS).toHaveLength(
      Object.keys(CATALOG_EXERCISES).length,
    );
    expect(CATALOG_MANIFEST_RECORDS.length).toBeGreaterThanOrEqual(
      releasedCatalogSnapshot.length,
    );
    expect(
      CATALOG_MANIFEST_RECORDS.every(
        (record) => !Object.prototype.hasOwnProperty.call(record, "id"),
      ),
    ).toBe(true);
  });

  it("preserves every released record and its iteration order", () => {
    const expected = Object.fromEntries(
      releasedCatalogSnapshot.map(
        ([
          slug,
          name,
          role,
          loggingKind,
          requiredEquipment,
          movementFamily,
          primaryMuscles,
          aliases,
          instructions,
        ]) => [
          slug,
          {
            slug,
            name,
            role,
            loggingKind,
            requiredEquipment,
            movementFamily,
            primaryMuscles,
            aliases,
            instructions,
          },
        ],
      ),
    );

    expect(Object.keys(CATALOG_EXERCISES).slice(0, releasedCatalogSnapshot.length)).toEqual(
      releasedCatalogSnapshot.map(([slug]) => slug),
    );
    for (const [slug, exercise] of Object.entries(expected)) {
      expect(CATALOG_EXERCISES[slug]).toEqual(exercise);
    }
  });

  it("normalizes aliases with the same rule used by seed rows", () => {
    expect(normalizeCatalogAlias("  DB BENCH PRESS ")).toBe("db bench press");
  });

  const failureCases: readonly [
    string,
    (record: CatalogManifestRecord) => CatalogManifestInput,
  ][] = [
    [
      "duplicate slug",
      (record) => [record, { ...record }],
    ],
    [
      "missing alias",
      (record) =>
        [{ ...record, aliases: [" "] }] as unknown as CatalogManifestInput,
    ],
    [
      "duplicate normalized alias",
      (record) => [
        { ...record, aliases: ["Test move", " test MOVE "] },
      ] as unknown as CatalogManifestInput,
    ],
    [
      "invalid family",
      (record) => [{ ...record, movementFamily: " " }],
    ],
    [
      "empty muscles",
      (record) => [{ ...record, primaryMuscles: [] }],
    ],
    [
      "instruction count",
      (record) =>
        [{ ...record, instructions: ["Only one cue"] }] as unknown as CatalogManifestInput,
    ],
    [
      "medical or outcome claim",
      (record) => [
        {
          ...record,
          instructions: [
            "Set a stable starting position.",
            "Move the load under control.",
            "This builds muscle and prevents injury.",
          ],
        },
      ] as unknown as CatalogManifestInput,
    ],
  ];

  it.each(failureCases)("fails closed for %s", (_label, makeRecords) => {
    expect(() => generateCatalog(makeRecords(validRecord()))).toThrow();
  });

  it("preserves deterministic record and field ordering while freezing output", () => {
    const first = generateCatalog([validRecord()]);
    const second = generateCatalog([validRecord()]);

    expect(first).toEqual(second);
    expect(Object.keys(first)).toEqual(["test-movement"]);
    expect(first["test-movement"]).toEqual({
      slug: "test-movement",
      name: "Test movement",
      role: "compound",
      loggingKind: "weight_reps",
      requiredEquipment: ["dumbbells"],
      movementFamily: "test-family",
      primaryMuscles: ["upper back"],
      aliases: ["Test move", "test variation"],
      instructions: [
        "Set a stable starting position.",
        "Move the load under control.",
        "Return to the start before the position changes.",
      ],
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first["test-movement"])).toBe(true);
    expect(Object.isFrozen(first["test-movement"]?.requiredEquipment)).toBe(true);
    expect(Object.isFrozen(first["test-movement"]?.instructions)).toBe(true);
  });
});
