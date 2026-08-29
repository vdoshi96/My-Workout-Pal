import { describe, expect, it } from "vitest";

import {
  addProgramPrescription,
  replaceProgramPrescription,
  validateProgramExerciseSelections,
  type ProgramExerciseCandidate,
} from "@/components/program/program-editor-model";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { CATALOG_EXERCISES } from "@/domain/exercises/catalog";
import {
  generateCatalog,
  type CatalogManifestRecord,
  type LoggingKind,
} from "@/domain/exercises/catalog-generator";
import {
  conditioningAndCarriesManifest,
  coreManifest,
  mobilityAndRecoveryManifest,
} from "@/domain/exercises/catalog-manifests";
import { listCatalogExercises } from "@/domain/exercises/library";
import type { MovementSelection } from "@/domain/exercises/movement-chooser-contract";
import type { ProgramPublishInput } from "@/domain/programs/publication";
import { validateSetDraft } from "@/domain/workout-runner";

type ExpectedInventoryRecord = readonly [
  slug: string,
  name: string,
  role: CatalogManifestRecord["role"],
  loggingKind: LoggingKind,
  requiredEquipment: readonly CatalogManifestRecord["requiredEquipment"][number][],
];

const expectedCore = [
  ["crunch", "Crunch", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["sit-up", "Sit-up", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["heel-tap", "Heel tap", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["toe-touch", "Toe touch", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["lying-leg-raise", "Lying leg raise", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["bent-knee-leg-raise", "Bent-knee leg raise", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["flutter-kick", "Flutter kick", "core-timed", "duration", ["bodyweight"]],
  ["scissor-kick", "Scissor kick", "core-timed", "duration", ["bodyweight"]],
  ["mountain-climber", "Mountain climber", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["cross-body-mountain-climber", "Cross-body mountain climber", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["russian-twist", "Russian twist", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["v-up", "V-up", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["tuck-up", "Tuck-up", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["superman-hold", "Superman hold", "core-timed", "duration", ["bodyweight"]],
  ["bear-plank", "Bear plank", "core-timed", "duration", ["bodyweight"]],
  ["plank-up-down", "Plank up-down", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["side-plank-reach-through", "Side plank reach-through", "core-reps", "bodyweight_reps", ["bodyweight"]],
  ["dead-bug-heel-tap", "Dead bug heel tap", "core-reps", "bodyweight_reps", ["bodyweight"]],
] as const satisfies readonly ExpectedInventoryRecord[];

const expectedConditioningAndCarries = [
  ["burpee", "Burpee", "compound", "bodyweight_reps", ["bodyweight"]],
  ["squat-thrust", "Squat thrust", "compound", "bodyweight_reps", ["bodyweight"]],
  ["jumping-jack", "Jumping jack", "compound", "duration", ["bodyweight"]],
  ["high-knees", "High knees", "compound", "duration", ["bodyweight"]],
  ["skater-hop", "Skater hop", "compound", "bodyweight_reps", ["bodyweight"]],
  ["dumbbell-thruster", "Dumbbell thruster", "compound", "weight_reps", ["dumbbells"]],
  ["dumbbell-clean", "Dumbbell clean", "compound", "weight_reps", ["dumbbells"]],
  ["dumbbell-clean-and-press", "Dumbbell clean and press", "compound", "weight_reps", ["dumbbells"]],
  ["dumbbell-snatch", "Dumbbell snatch", "compound", "weight_reps", ["dumbbells"]],
  ["dumbbell-farmer-carry", "Dumbbell farmer carry", "accessory", "distance_duration", ["dumbbells"]],
  ["dumbbell-suitcase-carry", "Dumbbell suitcase carry", "accessory", "distance_duration", ["dumbbells"]],
  ["dumbbell-front-rack-carry", "Dumbbell front-rack carry", "accessory", "distance_duration", ["dumbbells"]],
  ["bear-crawl", "Bear crawl", "compound", "distance_duration", ["bodyweight"]],
  ["reverse-bear-crawl", "Reverse bear crawl", "compound", "distance_duration", ["bodyweight"]],
] as const satisfies readonly ExpectedInventoryRecord[];

const expectedMobilityAndRecovery = [
  ["cat-cow", "Cat-cow", "accessory", "bodyweight_reps", ["bodyweight"]],
  ["childs-pose", "Child's pose", "accessory", "duration", ["bodyweight"]],
  ["half-kneeling-thoracic-rotation", "Half-kneeling thoracic rotation", "accessory", "bodyweight_reps", ["bodyweight"]],
  ["kneeling-hip-flexor-stretch", "Kneeling hip flexor stretch", "accessory", "duration", ["bodyweight"]],
  ["seated-hamstring-stretch", "Seated hamstring stretch", "accessory", "duration", ["bodyweight"]],
  ["ninety-ninety-hip-switch", "90/90 hip switch", "accessory", "bodyweight_reps", ["bodyweight"]],
  ["figure-four-stretch", "Figure-four stretch", "accessory", "duration", ["bodyweight"]],
  ["standing-calf-stretch", "Standing calf stretch", "accessory", "duration", ["bodyweight"]],
  ["shoulder-wall-slide", "Shoulder wall slide", "accessory", "bodyweight_reps", ["bodyweight"]],
  ["prone-cobra", "Prone cobra", "accessory", "duration", ["bodyweight"]],
] as const satisfies readonly ExpectedInventoryRecord[];

const expectedOwnedInventory = [
  ...expectedCore,
  ...expectedConditioningAndCarries,
  ...expectedMobilityAndRecovery,
] as const;

function inventoryShape(records: readonly CatalogManifestRecord[]): readonly ExpectedInventoryRecord[] {
  return records.map((record) => [
    record.slug,
    record.name,
    record.role,
    record.loggingKind,
    record.requiredEquipment,
  ]);
}

function ownedRecords(): readonly CatalogManifestRecord[] {
  return [
    ...coreManifest.slice(8),
    ...conditioningAndCarriesManifest,
    ...mobilityAndRecoveryManifest,
  ];
}

function selection(slug: string, id: string): MovementSelection {
  const exercise = CATALOG_EXERCISES[slug];
  if (!exercise) throw new Error(`Missing test catalog movement: ${slug}`);
  return {
    source: { kind: "catalog", id },
    name: exercise.name,
    loggingKind: exercise.loggingKind,
  };
}

function candidate(slug: string, id: string): ProgramExerciseCandidate {
  const exercise = CATALOG_EXERCISES[slug];
  if (!exercise) throw new Error(`Missing test catalog movement: ${slug}`);
  return {
    id,
    kind: "catalog",
    loggingKind: exercise.loggingKind,
    name: exercise.name,
    requiredEquipment: exercise.requiredEquipment,
    role: exercise.role,
    searchText: [
      exercise.slug,
      exercise.movementFamily,
      ...exercise.aliases,
      ...exercise.primaryMuscles,
    ].join(" "),
  };
}

function programDraft(): ProgramPublishInput {
  return {
    baseRevisionId: "10000000-0000-4000-8000-000000000001",
    idempotencyKey: "wave-2-core-conditioning",
    name: "Wave 2 routine",
    programId: "10000000-0000-4000-8000-000000000002",
    days: [
      {
        cardio: [],
        dayKey: "10000000-0000-4000-8000-000000000003",
        dayNumber: 1,
        displayName: "Mixed conditioning",
        sections: [
          {
            kind: "core",
            sectionKey: "10000000-0000-4000-8000-000000000004",
            title: "Core and carries",
            prescriptions: [
              {
                catalogExerciseId: "10000000-0000-4000-8000-000000000005",
                customExerciseId: null,
                displayName: null,
                maximumReps: 12,
                maximumSeconds: null,
                minimumReps: 8,
                minimumSeconds: null,
                notes: "Keep the authored note.",
                prescriptionKey: "10000000-0000-4000-8000-000000000006",
                restSeconds: 75,
                setCount: 3,
                setKind: "work",
                sourcePrescriptionId: "10000000-0000-4000-8000-000000000007",
                targetDistanceM: null,
                targetWeightKg: 12,
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("Wave 2 core, conditioning, carry, and mobility catalog expansion", () => {
  it("appends the exact 42-record inventory in its bounded category order", () => {
    expect(inventoryShape(coreManifest.slice(8))).toEqual(expectedCore);
    expect(inventoryShape(conditioningAndCarriesManifest)).toEqual(
      expectedConditioningAndCarries,
    );
    expect(inventoryShape(mobilityAndRecoveryManifest)).toEqual(
      expectedMobilityAndRecovery,
    );
    expect(ownedRecords()).toHaveLength(42);
  });

  it("uses only the generator schema and exactly three bounded instructions", () => {
    const records = ownedRecords();
    expect(records).toHaveLength(42);

    for (const record of records) {
      expect(record).not.toHaveProperty("id");
      expect(record).not.toHaveProperty("videoStatus");
      expect(record).not.toHaveProperty("videoUrls");
      expect(record.primaryMuscles.length).toBeGreaterThan(0);
      expect(record.aliases.length).toBeGreaterThan(0);
      expect(record.instructions).toHaveLength(3);
    }

    const first = generateCatalog(records);
    const second = generateCatalog(records);
    expect(Object.keys(first)).toEqual(expectedOwnedInventory.map(([slug]) => slug));
    expect(second).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.values(first).every((record) => Object.isFrozen(record))).toBe(true);
  });

  it("represents the exact supported logging-kind distribution", () => {
    const counts = Object.groupBy(ownedRecords(), ({ loggingKind }) => loggingKind);

    expect({
      bodyweight_reps: counts.bodyweight_reps?.length ?? 0,
      duration: counts.duration?.length ?? 0,
      weight_reps: counts.weight_reps?.length ?? 0,
      distance_duration: counts.distance_duration?.length ?? 0,
    }).toEqual({
      bodyweight_reps: 21,
      duration: 12,
      weight_reps: 4,
      distance_duration: 5,
    });
  });

  it("finds representative records by name and alias in both supported profiles", () => {
    expect(
      listCatalogExercises({
        profile: EQUIPMENT_PROFILES.dumbbells,
        query: "farmers walk",
      }).map(({ slug }) => slug),
    ).toEqual(["dumbbell-farmer-carry"]);
    expect(
      listCatalogExercises({
        profile: EQUIPMENT_PROFILES.barbell,
        query: "ninety ninety",
      }).map(({ slug }) => slug),
    ).toEqual(["ninety-ninety-hip-switch"]);
    expect(
      listCatalogExercises({
        profile: EQUIPMENT_PROFILES.dumbbells,
        query: "Dumbbell farmer carry",
      }).map(({ slug }) => slug),
    ).toContain("dumbbell-farmer-carry");
    expect(
      listCatalogExercises({
        profile: EQUIPMENT_PROFILES.dumbbells,
        query: "cross body mountain climber",
      }).map(({ slug }) => slug),
    ).toEqual(["cross-body-mountain-climber"]);
    expect(
      listCatalogExercises({
        profile: EQUIPMENT_PROFILES.barbell,
        query: "hip rotators",
      }).map(({ slug }) => slug),
    ).toEqual(expect.arrayContaining(["figure-four-stretch", "ninety-ninety-hip-switch"]));
    expect(
      listCatalogExercises({
        profile: EQUIPMENT_PROFILES.dumbbells,
        query: "dumbbells loaded carry",
      }).map(({ slug }) => slug),
    ).toEqual([
      "dumbbell-farmer-carry",
      "dumbbell-front-rack-carry",
      "dumbbell-suitcase-carry",
    ]);

    for (const profile of Object.values(EQUIPMENT_PROFILES)) {
      const slugs = new Set(listCatalogExercises({ profile }).map(({ slug }) => slug));
      expect(expectedOwnedInventory.every(([slug]) => slugs.has(slug))).toBe(true);
    }
  });

  it("uses duration defaults and requires deliberate positive distance input", () => {
    const carryId = "20000000-0000-4000-8000-000000000001";
    const next = addProgramPrescription(
      programDraft(),
      0,
      0,
      selection("dumbbell-farmer-carry", carryId),
    );
    const carry = next.days[0]!.sections[0]!.prescriptions.at(-1)!;

    expect(carry).toMatchObject({
      maximumReps: null,
      maximumSeconds: 45,
      minimumReps: null,
      minimumSeconds: 20,
      targetDistanceM: null,
      targetWeightKg: null,
    });

    const candidates = [
      {
        id: "10000000-0000-4000-8000-000000000005",
        kind: "catalog" as const,
        loggingKind: "weight_reps" as const,
        name: "Existing movement",
        requiredEquipment: ["dumbbells"] as const,
        role: "compound" as const,
        searchText: "existing movement",
      },
      candidate("dumbbell-farmer-carry", carryId),
    ];

    expect(validateProgramExerciseSelections(next, candidates)).toEqual([
      "Dumbbell farmer carry needs a positive distance target before publication.",
    ]);
    carry.targetDistanceM = 40;
    expect(validateProgramExerciseSelections(next, candidates)).toEqual([]);

    const durationId = "20000000-0000-4000-8000-000000000002";
    const withDuration = addProgramPrescription(
      programDraft(),
      0,
      0,
      selection("flutter-kick", durationId),
    );
    const duration = withDuration.days[0]!.sections[0]!.prescriptions.at(-1)!;
    expect(duration).toMatchObject({
      maximumReps: null,
      maximumSeconds: 45,
      minimumReps: null,
      minimumSeconds: 20,
      targetDistanceM: null,
      targetWeightKg: null,
    });
    expect(
      validateProgramExerciseSelections(withDuration, [
        candidates[0]!,
        candidate("flutter-kick", durationId),
      ]),
    ).toEqual([]);
  });

  it("preserves same-kind targets and resets incompatible cross-kind values", () => {
    const cleanId = "30000000-0000-4000-8000-000000000001";
    const carryId = "30000000-0000-4000-8000-000000000002";
    const draft = programDraft();
    const sameKind = replaceProgramPrescription(
      draft,
      0,
      0,
      0,
      selection("dumbbell-clean", cleanId),
      "weight_reps",
    );
    const crossKind = replaceProgramPrescription(
      draft,
      0,
      0,
      0,
      selection("dumbbell-suitcase-carry", carryId),
      "weight_reps",
    );

    expect(sameKind.days[0]!.sections[0]!.prescriptions[0]).toMatchObject({
      catalogExerciseId: cleanId,
      maximumReps: 12,
      minimumReps: 8,
      notes: "Keep the authored note.",
      prescriptionKey: "10000000-0000-4000-8000-000000000006",
      restSeconds: 75,
      setCount: 3,
      sourcePrescriptionId: "10000000-0000-4000-8000-000000000007",
      targetWeightKg: 12,
    });
    expect(crossKind.days[0]!.sections[0]!.prescriptions[0]).toMatchObject({
      catalogExerciseId: carryId,
      maximumReps: null,
      maximumSeconds: 45,
      minimumReps: null,
      minimumSeconds: 20,
      notes: "Keep the authored note.",
      prescriptionKey: "10000000-0000-4000-8000-000000000006",
      restSeconds: 75,
      setCount: 3,
      sourcePrescriptionId: "10000000-0000-4000-8000-000000000007",
      targetDistanceM: null,
      targetWeightKg: null,
    });
  });

  it("keeps both distance and duration in the runner measurement", () => {
    expect(CATALOG_EXERCISES["bear-crawl"]?.loggingKind).toBe(
      "distance_duration",
    );
    expect(
      validateSetDraft(
        {
          kind: "distance_duration",
          distanceMeters: 24,
          durationSeconds: 35,
        },
        "distance_duration",
      ),
    ).toEqual({
      ok: true,
      measurement: {
        kind: "distance_duration",
        distanceMeters: 24,
        durationSeconds: 35,
      },
    });
  });
});
