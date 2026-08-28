import { describe, expect, it } from "vitest";

import { programPublishRequestSchema } from "@/domain/programs/publication";
import {
  parseEquipmentChangeResponse,
  parseOnboardingResponse,
  parseProgramPublishResponse,
  parseProgramRevisionMutationResponse,
} from "@/components/program/program-mutation-response";
import {
  addProgramPrescription,
  addProgramCardio,
  addProgramDay,
  addProgramSection,
  duplicateProgramDay,
  filterProgramExerciseCandidates,
  programEditorCanonicalValue,
  programEditorDisplayValue,
  programEditorDraftFromPublishInput,
  programPublishInputFromReadModel,
  programEditorUnitLabels,
  removeProgramCardio,
  removeProgramDay,
  removeProgramSection,
  removeProgramPrescription,
  replaceProgramPrescription,
  renameProgramDay,
  renameProgramSection,
  reorderProgramDay,
  reorderProgramCardio,
  reorderProgramSection,
  reorderProgramPrescription,
  reviewProgramDayRemoval,
  reviewProgramPrescriptionRemoval,
  reviewProgramSectionRemoval,
  stripLocalProgramPrescriptionIds,
  validateProgramSectionStructure,
  validateProgramExerciseSelections,
  type ProgramExerciseCandidate,
} from "@/components/program/program-editor-model";
import type { ActiveProgramReadModel } from "@/server/repositories/profile-program";
import { programMovementSelectionFromCandidate } from "@/components/program/program-movement-selection";

function programReadModel(): ActiveProgramReadModel {
  const dayKeys = ["push", "pull", "legs", "upper", "lower"] as const;
  return {
    id: "11111111-1111-4111-8111-111111111111",
    programKey: "five-day-starter-route",
    name: "My route",
    equipmentProfileKind: "dumbbells",
    revisionId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 3,
    status: "published",
    publishedAt: "2026-08-25T12:00:00.000Z",
    sourceTemplateRevisionId: null,
    days: dayKeys.map((dayKey, dayIndex) => {
      const prescriptions = [0, 1].map((prescriptionIndex) => ({
        id: `33333333-3333-4333-8333-33333333333${dayIndex * 2 + prescriptionIndex}`,
        prescriptionKey: `33333333-3333-4333-8333-33333333333${dayIndex * 2 + prescriptionIndex}`,
        catalogExerciseId: `44444444-4444-4444-8444-44444444444${prescriptionIndex}`,
        customExerciseId: null,
        exercise: {
          id: `44444444-4444-4444-8444-44444444444${prescriptionIndex}`,
          slug: `exercise-${prescriptionIndex}`,
          name: `Exercise ${prescriptionIndex + 1}`,
          movementFamily: "press",
          loggingKind: "weight_reps" as const,
          role: "compound" as const,
          kind: "catalog" as const,
          requiredEquipment: ["dumbbells" as const],
        },
        customExercise: null,
        displayName: null,
        label: `Exercise ${prescriptionIndex + 1}`,
        displayOrder: prescriptionIndex + 1,
        setKind: "work" as const,
        setCount: 3,
        measurementKind: "weight_reps" as const,
        minimumReps: 8,
        maximumReps: 12,
        minimumSeconds: null,
        maximumSeconds: null,
        restSeconds: 90,
        targetWeightKg: 20,
        targetDistanceM: null,
        notes: null,
        targetMetadata: {},
      }));
      const corePrescription = {
        ...prescriptions[1]!,
        displayOrder: 1,
        id: `99999999-9999-4999-8999-99999999999${dayIndex}`,
        prescriptionKey: `99999999-9999-4999-8999-99999999999${dayIndex}`,
      };
      return {
        id: `55555555-5555-4555-8555-55555555555${dayIndex}`,
        dayNumber: dayIndex + 1,
        dayKey,
        displayName: dayKey[0]!.toUpperCase() + dayKey.slice(1),
        sections: [
          {
            id: `66666666-6666-4666-8666-66666666666${dayIndex}`,
            sectionKey: `66666666-6666-4666-8666-66666666666${dayIndex}`,
            kind: "strength" as const,
            displayOrder: 1,
            title: "Strength",
            prescriptions,
          },
          {
            id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${dayIndex}`,
            sectionKey: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${dayIndex}`,
            kind: "core" as const,
            displayOrder: 2,
            title: "Core",
            prescriptions: [corePrescription],
          },
        ],
        prescriptions: [...prescriptions, corePrescription],
        cardio: [
          {
            id: `77777777-7777-4777-8777-77777777777${dayIndex}`,
            cardioKey: `77777777-7777-4777-8777-77777777777${dayIndex}`,
            mode: "walker" as const,
            durationSeconds: 1_200,
            distanceM: null,
            paceSecondsPerKm: null,
            inclinePercent: 2,
            notes: null,
          },
          {
            id: `88888888-8888-4888-8888-88888888888${dayIndex}`,
            cardioKey: `88888888-8888-4888-8888-88888888888${dayIndex}`,
            mode: "runner" as const,
            durationSeconds: 1_800,
            distanceM: 5_000,
            paceSecondsPerKm: 360,
            inclinePercent: null,
            notes: null,
          },
        ],
      };
    }),
  };
}

function candidate(
  overrides: Partial<ProgramExerciseCandidate> = {},
): ProgramExerciseCandidate {
  return {
    id: "99999999-9999-4999-8999-999999999999",
    kind: "catalog",
    loggingKind: "weight_reps",
    name: "Route press",
    requiredEquipment: ["dumbbells"],
    role: "compound",
    searchText: "route press chest dumbbells",
    ...overrides,
  };
}

function selection(overrides: Partial<ProgramExerciseCandidate> = {}) {
  return programMovementSelectionFromCandidate(candidate(overrides));
}

describe("program editor request model", () => {
  it("rejects successful mutation bodies whose active graph violates publication invariants", () => {
    const activeProgram = programReadModel();
    const envelope = {
      profileProgram: {
        activeProgram,
        affectedProgramId: activeProgram.id,
        affectedRevisionId: activeProgram.revisionId,
        changes: [],
        replayed: false,
      },
    };
    expect(parseProgramRevisionMutationResponse(envelope).activeProgram).toEqual(activeProgram);
    expect(parseEquipmentChangeResponse(envelope, {
      changes: [],
      programId: activeProgram.id,
      targetProfileKind: "dumbbells",
    }).activeProgram).toEqual(activeProgram);
    expect(parseOnboardingResponse({
      profileProgram: {
        activeProgram,
        equipment: { profileKind: "dumbbells" },
        preferences: {
          reducedMotion: false,
          timezone: "UTC",
          unitSystem: "metric",
          updatedAt: "2026-08-26T18:00:00.000Z",
        },
      },
    }, {
      equipmentProfileKind: "dumbbells",
      reducedMotion: false,
      timezone: "UTC",
      unitSystem: "metric",
    })).toEqual(activeProgram);

    const duplicateDay = {
      profileProgram: {
        ...envelope.profileProgram,
        activeProgram: {
          ...activeProgram,
          days: activeProgram.days.map((day, index) =>
            index === 1 ? { ...day, dayKey: "push" } : day,
          ),
        },
      },
    };
    expect(() => parseProgramRevisionMutationResponse(duplicateDay)).toThrow(
      "invalid program mutation response",
    );

    const firstDayWithoutCore = {
      ...activeProgram.days[0]!,
      sections: activeProgram.days[0]!.sections.filter(({ kind }) => kind !== "core"),
    };
    const missingCore = {
      profileProgram: {
        ...envelope.profileProgram,
        activeProgram: {
          ...activeProgram,
          days: [
            {
              ...firstDayWithoutCore,
              prescriptions: firstDayWithoutCore.sections.flatMap(
                ({ prescriptions }) => prescriptions,
              ),
            },
            ...activeProgram.days.slice(1),
          ],
        },
      },
    };
    expect(parseEquipmentChangeResponse(missingCore, {
      changes: [],
      programId: activeProgram.id,
      targetProfileKind: "dumbbells",
    }).activeProgram).toEqual(missingCore.profileProgram.activeProgram);

    const duplicateSectionKey = {
      profileProgram: {
        ...envelope.profileProgram,
        activeProgram: {
          ...activeProgram,
          days: activeProgram.days.map((day, index) => index === 0
            ? {
                ...day,
                sections: day.sections.map((section, sectionIndex) => sectionIndex === 1
                  ? { ...section, sectionKey: day.sections[0]!.sectionKey }
                  : section),
              }
            : day),
        },
      },
    };
    expect(() => parseEquipmentChangeResponse(duplicateSectionKey, {
      changes: [],
      programId: activeProgram.id,
      targetProfileKind: "dumbbells",
    })).toThrow("invalid equipment mutation response");

    const invalidFirstSection = {
      ...activeProgram.days[0]!.sections[0]!,
      prescriptions: activeProgram.days[0]!.sections[0]!.prescriptions.map(
        (prescription, index) => index === 0
          ? {
              ...prescription,
              customExerciseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            }
          : prescription,
      ),
    };
    const invalidFirstDay = {
      ...activeProgram.days[0]!,
      sections: [invalidFirstSection, ...activeProgram.days[0]!.sections.slice(1)],
    };
    const invalidIdentity = {
      profileProgram: {
        ...envelope.profileProgram,
        activeProgram: {
          ...activeProgram,
          days: [invalidFirstDay, ...activeProgram.days.slice(1)],
        },
      },
    };
    expect(() => parseProgramRevisionMutationResponse(invalidIdentity)).toThrow(
      "invalid program mutation response",
    );

    expect(() => parseProgramPublishResponse(envelope, {
      ...programPublishInputFromReadModel(activeProgram, "publish-binding"),
      name: "A different valid route",
    })).toThrow("does not match the published draft");
    const reorderedCardioDraft = programPublishInputFromReadModel(
      activeProgram,
      "publish-cardio-order",
    );
    reorderedCardioDraft.days[0]!.cardio = reorderedCardioDraft.days[0]!.cardio.map(
      (cardio) => ({
        distanceM: cardio.distanceM,
        durationSeconds: cardio.durationSeconds,
        inclinePercent: cardio.inclinePercent,
        cardioKey: cardio.cardioKey,
        mode: cardio.mode,
        notes: cardio.notes,
        paceSecondsPerKm: cardio.paceSecondsPerKm,
      }),
    );
    expect(() => parseProgramPublishResponse(envelope, reorderedCardioDraft)).not.toThrow();
    const changedPrescriptionKey = {
      ...envelope,
      profileProgram: {
        ...envelope.profileProgram,
        activeProgram: {
          ...activeProgram,
          days: activeProgram.days.map((day, dayIndex) => dayIndex === 0
            ? {
                ...day,
                sections: day.sections.map((section, sectionIndex) => sectionIndex === 0
                  ? {
                      ...section,
                      prescriptions: section.prescriptions.map((prescription, index) => index === 0
                        ? {
                            ...prescription,
                            prescriptionKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                          }
                        : prescription),
                    }
                  : section),
              }
            : day),
        },
      },
    };
    expect(() => parseProgramPublishResponse(
      changedPrescriptionKey,
      programPublishInputFromReadModel(activeProgram, "publish-key-binding"),
    )).toThrow("does not match the published draft");
    expect(() => parseEquipmentChangeResponse(envelope, {
      changes: [],
      programId: activeProgram.id,
      targetProfileKind: "barbell",
    })).toThrow("does not match the requested equipment profile");
    expect(() => parseEquipmentChangeResponse(envelope, {
      changes: [{
        cleared: ["load target", "distance target", "movement metadata"],
        dayDisplayName: "Push",
        fromName: "Exercise 1",
        fromSlug: "exercise-0",
        prescriptionId: activeProgram.days[0]!.sections[0]!.prescriptions[0]!.id,
        preserved: ["sets", "rep range", "rest", "section", "order", "notes"],
        toName: "Exercise 2",
        toSlug: "exercise-1",
      }],
      programId: activeProgram.id,
      targetProfileKind: "dumbbells",
    })).toThrow("does not match the reviewed equipment substitutions");
  });

  it("converts only at the unit boundary with finite, rounded display values", () => {
    const canonical = {
      targetWeightKg: 20,
      targetDistanceM: 5_000,
      paceSecondsPerKm: 360,
    };
    const snapshot = structuredClone(canonical);

    expect(programEditorUnitLabels("metric")).toEqual({
      distance: "metres",
      pace: "seconds / km",
      weight: "kg",
    });
    expect(programEditorUnitLabels("imperial")).toEqual({
      distance: "miles",
      pace: "seconds / mile",
      weight: "lb",
    });
    expect(programEditorDisplayValue(canonical.targetWeightKg, "weight", "imperial")).toBe("44.09");
    expect(programEditorDisplayValue(canonical.targetDistanceM, "distance", "imperial")).toBe("3.1069");
    expect(programEditorDisplayValue(1.001, "distance", "imperial")).toBe("0.0006");
    expect(programEditorDisplayValue(160.934, "distance", "imperial")).toBe("0.1");
    expect(programEditorDisplayValue(canonical.paceSecondsPerKm, "pace", "imperial")).toBe("579");
    expect(programEditorCanonicalValue("25", "weight", "imperial")).toBe(11.34);
    expect(programEditorCanonicalValue("0.1", "distance", "imperial")).toBe(160.934);
    expect(programEditorCanonicalValue("600", "pace", "imperial")).toBe(373);
    expect(programEditorCanonicalValue("", "weight", "imperial")).toBeNull();
    expect(programEditorCanonicalValue("Infinity", "distance", "imperial")).toBeNull();
    expect(programEditorCanonicalValue("not-a-number", "pace", "imperial")).toBeNull();
    expect(canonical).toEqual(snapshot);

    const imperialDraft = programEditorDraftFromPublishInput(
      programPublishInputFromReadModel(programReadModel(), "imperial-draft"),
    );
    imperialDraft.days[0]!.cardio[0]!.distanceM = programEditorCanonicalValue(
      "0.1",
      "distance",
      "imperial",
    );
    expect(imperialDraft.days[0]!.cardio[0]!.distanceM).toBe(160.934);
    const publishableImperialDraft = () =>
      stripLocalProgramPrescriptionIds(imperialDraft, new Set());
    expect(programPublishRequestSchema.safeParse(publishableImperialDraft()).success).toBe(true);
    imperialDraft.days[0]!.cardio[0]!.distanceM = 1.001;
    expect(programPublishRequestSchema.safeParse(publishableImperialDraft()).success).toBe(true);
    imperialDraft.days[0]!.cardio[0]!.distanceM = 0.0001;
    expect(programPublishRequestSchema.safeParse(publishableImperialDraft()).success).toBe(false);
    imperialDraft.days[0]!.cardio[0]!.distanceM = 160.9345;
    expect(programPublishRequestSchema.safeParse(publishableImperialDraft()).success).toBe(false);
    imperialDraft.days[0]!.cardio[0]!.distanceM = programEditorCanonicalValue(
      "160.9345",
      "distance",
      "metric",
    );
    expect(imperialDraft.days[0]!.cardio[0]!.distanceM).toBe(160.935);
    expect(programPublishRequestSchema.safeParse(publishableImperialDraft()).success).toBe(true);
  });

  it("binds equipment success to the exact reviewed substitution set independent of database order", () => {
    const activeProgram = programReadModel();
    const firstId = activeProgram.days[0]!.sections[0]!.prescriptions[0]!.id;
    const secondId = activeProgram.days[1]!.sections[0]!.prescriptions[0]!.id;
    const expected = [
      {
        cleared: ["load target", "distance target", "movement metadata"] as const,
        dayDisplayName: "Push",
        fromName: "First movement",
        fromSlug: "first-from",
        prescriptionId: firstId,
        preserved: ["sets", "rep range", "rest", "section", "order", "notes"] as const,
        toName: "First replacement",
        toSlug: "first-to",
      },
      {
        cleared: ["load target", "distance target", "movement metadata"] as const,
        dayDisplayName: "Pull",
        fromName: "Second movement",
        fromSlug: "second-from",
        prescriptionId: secondId,
        preserved: ["sets", "rep range", "rest", "section", "order", "notes"] as const,
        toName: "Second replacement",
        toSlug: "second-to",
      },
    ];
    const envelope = {
      profileProgram: {
        activeProgram,
        affectedProgramId: activeProgram.id,
        affectedRevisionId: activeProgram.revisionId,
        changes: expected.toReversed(),
        replayed: false,
      },
    };

    expect(parseEquipmentChangeResponse(envelope, {
      changes: expected,
      programId: activeProgram.id,
      targetProfileKind: "dumbbells",
    }).changeCount).toBe(2);
  });

  it("edits sections immutably with stable keys and an explicit truthful removal review", () => {
    const input = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const draft = programEditorDraftFromPublishInput(input);
    const withAccessory = addProgramSection(
      draft,
      0,
      "accessory",
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    );
    const renamed = renameProgramSection(withAccessory, 0, 2, "Accessory circuit");
    const moved = reorderProgramSection(renamed, 0, 2, -1);

    expect(moved).not.toBe(draft);
    expect(moved.days[0]!.sections.map(({ kind, draftKey, title }) => ({ kind, draftKey, title }))).toEqual([
      {
        kind: "strength",
        draftKey: "66666666-6666-4666-8666-666666666660",
        title: "Strength",
      },
      {
        kind: "accessory",
        draftKey: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        title: "Accessory circuit",
      },
      { kind: "core", draftKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0", title: "Core" },
    ]);
    expect(validateProgramSectionStructure(moved)).toEqual([
      "Push Accessory circuit needs at least one movement.",
    ]);
    const populated = addProgramPrescription(
      moved,
      0,
      1,
      selection({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        name: "Accessory row",
        role: null,
      }),
    );
    expect(validateProgramSectionStructure(populated)).toEqual([]);
    const withRepeatedCore = addProgramSection(
      populated,
      0,
      "core",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );
    expect(withRepeatedCore.days[0]!.sections.filter(({ kind }) => kind === "core")).toHaveLength(2);
    expect(() => removeProgramSection(moved, 0, 0, {
      confirmed: true,
      draftKey: "66666666-6666-4666-8666-666666666660",
      exerciseNames: ["Wrong movement"],
      prescriptionKeys: ["not-the-source"],
    })).toThrow(/review/i);

    const review = reviewProgramSectionRemoval(populated, 0, 1, ["Accessory row"]);
    expect(() => removeProgramSection(populated, 0, 1, { ...review, confirmed: false })).toThrow(/confirm/i);
    const removed = removeProgramSection(populated, 0, 1, { ...review, confirmed: true });

    expect(removed.days[0]!.sections.map(({ kind, draftKey }) => ({ kind, draftKey }))).toEqual([
      { kind: "strength", draftKey: "66666666-6666-4666-8666-666666666660" },
      { kind: "core", draftKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0" },
    ]);
    expect(moved.days[0]!.sections).toHaveLength(3);
    expect(stripLocalProgramPrescriptionIds(removed, new Set()).days[0]!.sections[0]).not.toHaveProperty("draftKey");
    const readded = addProgramSection(
      removed,
      0,
      "accessory",
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
    expect(readded.days[0]!.sections.map(({ kind, draftKey }) => ({ kind, draftKey }))).toEqual([
      { kind: "strength", draftKey: "66666666-6666-4666-8666-666666666660" },
      { kind: "core", draftKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0" },
      { kind: "accessory", draftKey: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
    ]);
    const withoutStrength = removeProgramSection(
      readded,
      0,
      0,
      { ...reviewProgramSectionRemoval(readded, 0, 0, ["Exercise 1", "Exercise 2"]), confirmed: true },
    );
    const oneSection = removeProgramSection(
      withoutStrength,
      0,
      1,
      { ...reviewProgramSectionRemoval(withoutStrength, 0, 1, []), confirmed: true },
    );
    const coreReview = reviewProgramSectionRemoval(readded, 0, 1, ["Exercise 2"]);
    const removedCore = removeProgramSection(readded, 0, 1, { ...coreReview, confirmed: true });
    expect(removedCore.days[0]!.sections.map(({ kind }) => kind)).toEqual(["strength", "accessory"]);
    expect(() => removeProgramSection(oneSection, 0, 0, {
      ...reviewProgramSectionRemoval(oneSection, 0, 0, ["Exercise 2"]),
      confirmed: true,
    })).toThrow(/at least one section/i);
  });

  it("adds, renames, duplicates, reorders, and removes days by stable key", () => {
    const input = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const draft = programEditorDraftFromPublishInput(input);
    const addedDayKey = "12345678-1234-4234-8234-123456789012";
    const addedSectionKey = "12345678-1234-4234-8234-123456789013";
    const added = addProgramDay(draft, {
      candidate: selection({
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        name: "New-day movement",
      }),
      dayKey: addedDayKey,
      displayName: "Intervals",
      sectionKey: addedSectionKey,
      sectionKind: "accessory",
      sectionTitle: "Engine room",
    });

    expect(added).not.toBe(draft);
    expect(draft.days).toHaveLength(5);
    expect(added.days.at(-1)).toMatchObject({
      dayKey: addedDayKey,
      dayNumber: 6,
      displayName: "Intervals",
      sections: [{
        kind: "accessory",
        sectionKey: addedSectionKey,
        title: "Engine room",
      }],
      cardio: [],
    });
    const addedPrescription = added.days.at(-1)!.sections[0]!.prescriptions[0]!;
    expect(addedPrescription.prescriptionKey).toMatch(/^[0-9a-f-]{36}$/i);

    const renamed = renameProgramDay(added, addedDayKey, "Intervals and carries");
    expect(renamed.days.at(-1)).toMatchObject({
      dayKey: addedDayKey,
      displayName: "Intervals and carries",
    });
    const reordered = reorderProgramDay(renamed, addedDayKey, -1);
    expect(reordered.days.find((day) => day.dayKey === addedDayKey)?.dayNumber).toBe(5);
    expect(reordered.days.map(({ dayNumber }) => dayNumber)).toEqual([1, 2, 3, 4, 5, 6]);

    const duplicateDayKey = "12345678-1234-4234-8234-123456789014";
    const duplicate = duplicateProgramDay(reordered, addedDayKey, { dayKey: duplicateDayKey });
    const source = duplicate.days.find((day) => day.dayKey === addedDayKey)!;
    const copy = duplicate.days.find((day) => day.dayKey === duplicateDayKey)!;
    expect(copy.displayName).toBe(source.displayName);
    expect(copy.dayNumber).toBe(source.dayNumber + 1);
    expect(copy.sections[0]!.sectionKey).not.toBe(source.sections[0]!.sectionKey);
    expect(copy.sections[0]!.prescriptions[0]!.prescriptionKey).not.toBe(
      source.sections[0]!.prescriptions[0]!.prescriptionKey,
    );
    expect(copy.sections[0]!.prescriptions[0]!.sourcePrescriptionId).toBe(
      source.sections[0]!.prescriptions[0]!.sourcePrescriptionId,
    );

    const review = reviewProgramDayRemoval(
      duplicate,
      duplicateDayKey,
      copy.sections.flatMap(({ prescriptions }) => prescriptions.map(() => "New-day movement")),
    );
    expect(review.dayKey).toBe(duplicateDayKey);
    expect(() => removeProgramDay(duplicate, duplicateDayKey, review)).toThrow(/confirm/i);
    const removed = removeProgramDay(duplicate, duplicateDayKey, { ...review, confirmed: true });
    expect(removed.days.some((day) => day.dayKey === duplicateDayKey)).toBe(false);
    expect(removed.days.map(({ dayNumber }) => dayNumber)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(() => removeProgramDay(removed, duplicateDayKey, { ...review, confirmed: true })).toThrow(
      /unavailable/i,
    );
  });

  it("permits repeated classifications, optional cardio, and bounded topology validation", () => {
    const draft = programEditorDraftFromPublishInput(
      programPublishInputFromReadModel(programReadModel(), "publish-key"),
    );
    const noCardio = structuredClone(draft);
    noCardio.days = [noCardio.days[0]!];
    noCardio.days[0]!.cardio = [];
    noCardio.days[0]!.sections = noCardio.days[0]!.sections.filter(({ kind }) => kind !== "core");
    expect(validateProgramSectionStructure(noCardio)).toEqual([]);

    const walkerKey = "12345678-1234-4234-8234-123456789015";
    const runnerKey = "12345678-1234-4234-8234-123456789016";
    const withWalker = addProgramCardio(noCardio, noCardio.days[0]!.dayKey, "walker", walkerKey);
    const withBoth = addProgramCardio(withWalker, noCardio.days[0]!.dayKey, "runner", runnerKey);
    expect(withBoth.days[0]!.cardio.map(({ mode, cardioKey, durationSeconds }) => ({
      mode,
      cardioKey,
      durationSeconds,
    }))).toEqual([
      { mode: "walker", cardioKey: walkerKey, durationSeconds: 1_200 },
      { mode: "runner", cardioKey: runnerKey, durationSeconds: 1_200 },
    ]);
    const cardioDuplicate = duplicateProgramDay(withBoth, noCardio.days[0]!.dayKey, {
      dayKey: "12345678-1234-4234-8234-123456789017",
    });
    expect(cardioDuplicate.days[1]!.cardio.map(({ cardioKey }) => cardioKey)).not.toEqual([
      walkerKey,
      runnerKey,
    ]);
    expect(() => addProgramCardio(withBoth, noCardio.days[0]!.dayKey, "walker")).toThrow(/already exists/i);
    const withoutWalker = removeProgramCardio(withBoth, noCardio.days[0]!.dayKey, walkerKey);
    const withoutCardio = removeProgramCardio(withoutWalker, noCardio.days[0]!.dayKey, "runner");
    expect(withoutCardio.days[0]!.cardio).toEqual([]);

    const tooManyInDay = structuredClone(noCardio);
    const firstSection = tooManyInDay.days[0]!.sections[0]!;
    firstSection.prescriptions = Array.from({ length: 41 }, (_, index) => ({
      ...firstSection.prescriptions[0]!,
      prescriptionKey: `12345678-1234-4234-8234-${String(index + 100).padStart(12, "0")}`,
    }));
    expect(validateProgramSectionStructure(tooManyInDay)).toContain(
      "Push Strength can contain at most 40 movements.",
    );

    const tooManyInRoutine = structuredClone(noCardio);
    tooManyInRoutine.days = Array.from({ length: 14 }, (_, dayIndex) => ({
      ...tooManyInRoutine.days[0]!,
      dayKey: `22345678-1234-4234-8234-${String(dayIndex + 100).padStart(12, "0")}`,
      dayNumber: dayIndex + 1,
      sections: tooManyInRoutine.days[0]!.sections.map((section) => ({
        ...section,
        sectionKey: `32345678-1234-4234-8234-${String(dayIndex + 100).padStart(12, "0")}`,
        prescriptions: Array.from({ length: 15 }, (_, prescriptionIndex) => ({
          ...section.prescriptions[0]!,
          prescriptionKey: `42345678-1234-4234-8234-${String(dayIndex * 20 + prescriptionIndex + 100).padStart(12, "0")}`,
        })),
      })),
    }));
    expect(validateProgramSectionStructure(tooManyInRoutine)).toContain(
      "A routine can contain at most 200 movements.",
    );
  });

  it("reorders alternative cardio immutably while preserving opaque identities", () => {
    const draft = programEditorDraftFromPublishInput(
      programPublishInputFromReadModel(programReadModel(), "publish-key"),
    );
    const dayKey = draft.days[0]!.dayKey;
    const originalKeys = draft.days[0]!.cardio.map(({ cardioKey }) => cardioKey);

    const reordered = reorderProgramCardio(
      draft,
      dayKey,
      originalKeys[1]!,
      -1,
    );

    expect(reordered).not.toBe(draft);
    expect(reordered.days[0]!.cardio.map(({ mode, cardioKey }) => ({ mode, cardioKey }))).toEqual([
      { mode: "runner", cardioKey: originalKeys[1] },
      { mode: "walker", cardioKey: originalKeys[0] },
    ]);
    expect(draft.days[0]!.cardio.map(({ cardioKey }) => cardioKey)).toEqual(originalKeys);
    expect(() => reorderProgramCardio(draft, dayKey, originalKeys[0]!, -1)).toThrow(/outside/i);
  });

  it("maps the owner-free active revision and preserves stable source identities", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");

    expect(draft).toMatchObject({
      programId: "11111111-1111-4111-8111-111111111111",
      baseRevisionId: "22222222-2222-4222-8222-222222222222",
      idempotencyKey: "publish-key",
      name: "My route",
    });
    expect(draft.days).toHaveLength(5);
    expect(draft.days[0]!.sections[0]!.prescriptions[0]).toMatchObject({
      sourcePrescriptionId: "33333333-3333-4333-8333-333333333330",
      prescriptionKey: "33333333-3333-4333-8333-333333333330",
      catalogExerciseId: "44444444-4444-4444-8444-444444444440",
      customExerciseId: null,
      minimumReps: 8,
      maximumReps: 12,
      minimumSeconds: null,
      maximumSeconds: null,
    });
    expect(draft.days[0]!.sections[0]!.sectionKey).toBe(
      "66666666-6666-4666-8666-666666666660",
    );
    expect(draft.days[0]!.cardio.map(({ cardioKey }) => cardioKey)).toEqual([
      "77777777-7777-4777-8777-777777777770",
      "88888888-8888-4888-8888-888888888880",
    ]);
    expect(JSON.stringify(draft)).not.toContain("firebaseUid");
    expect(JSON.stringify(draft)).not.toContain("measurementKind");
  });

  it("reorders one section immutably and rejects an out-of-range move", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const moved = reorderProgramPrescription(draft, 0, 0, 1, -1);

    expect(moved).not.toBe(draft);
    expect(moved.days[0]!.sections[0]!.prescriptions.map(({ sourcePrescriptionId }) => sourcePrescriptionId)).toEqual([
      "33333333-3333-4333-8333-333333333331",
      "33333333-3333-4333-8333-333333333330",
    ]);
    expect(draft.days[0]!.sections[0]!.prescriptions[0]!.sourcePrescriptionId).toBe(
      "33333333-3333-4333-8333-333333333330",
    );
    expect(() => reorderProgramPrescription(draft, 0, 0, 0, -1)).toThrow(/outside/i);
  });

  it("adds a strength movement with editable defaults without mutating the source draft", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const next = addProgramPrescription(draft, 0, 0, selection());

    expect(next).not.toBe(draft);
    expect(draft.days[0]!.sections[0]!.prescriptions).toHaveLength(2);
    expect(next.days[0]!.sections[0]!.prescriptions.at(-1)).toMatchObject({
      catalogExerciseId: "99999999-9999-4999-8999-999999999999",
      customExerciseId: null,
      displayName: null,
      maximumReps: 12,
      maximumSeconds: null,
      minimumReps: 8,
      minimumSeconds: null,
      notes: null,
      restSeconds: 90,
      setCount: 3,
      setKind: "work",
      sourcePrescriptionId: null,
      targetDistanceM: null,
      targetWeightKg: null,
    });
    expect(next.days[0]!.sections[0]!.prescriptions.at(-1)!.prescriptionKey).toMatch(
      /^[0-9a-f-]{36}$/i,
    );
  });

  it("uses section and logging meaning defaults for accessory, repetition core, and timed core", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const withSections = structuredClone(draft);
      withSections.days[0]!.sections.splice(1, 0, {
        kind: "accessory",
        prescriptions: [],
        sectionKey: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        title: "Accessory",
      });
    withSections.days[0]!.sections[2]!.prescriptions = [];
    const accessory = addProgramPrescription(withSections, 0, 1, selection());
    const repetitionCore = addProgramPrescription(
      accessory,
      0,
      2,
      selection({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", loggingKind: "bodyweight_reps" }),
    );
    const timedCore = addProgramPrescription(
      repetitionCore,
      0,
      2,
      selection({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", loggingKind: "duration" }),
    );

    expect(accessory.days[0]!.sections[1]!.prescriptions[0]).toMatchObject({
      maximumReps: 15,
      minimumReps: 10,
      restSeconds: 60,
      setCount: 2,
    });
    expect(repetitionCore.days[0]!.sections[2]!.prescriptions[0]).toMatchObject({
      maximumReps: 15,
      minimumReps: 8,
      restSeconds: 60,
      setCount: 2,
    });
    expect(timedCore.days[0]!.sections[2]!.prescriptions[1]).toMatchObject({
      maximumReps: null,
      maximumSeconds: 45,
      minimumReps: null,
      minimumSeconds: 20,
      restSeconds: 60,
      setCount: 2,
    });
  });

  it("preserves compatible targets for same-kind replacements and resets incompatible meaning", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const sameKind = replaceProgramPrescription(
      draft,
      0,
      0,
      0,
      selection(),
      "weight_reps",
    );
    const duration = replaceProgramPrescription(
      draft,
      0,
      0,
      0,
      selection({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        loggingKind: "duration",
        name: "Route hold",
        role: "core-timed",
      }),
      "weight_reps",
    );

    expect(sameKind.days[0]!.sections[0]!.prescriptions[0]).toMatchObject({
      catalogExerciseId: "99999999-9999-4999-8999-999999999999",
      maximumReps: 12,
      minimumReps: 8,
      sourcePrescriptionId: "33333333-3333-4333-8333-333333333330",
      targetWeightKg: 20,
    });
    expect(duration.days[0]!.sections[0]!.prescriptions[0]).toMatchObject({
      catalogExerciseId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      maximumReps: null,
      maximumSeconds: 45,
      minimumReps: null,
      minimumSeconds: 20,
      notes: null,
      restSeconds: 90,
      setCount: 3,
      sourcePrescriptionId: "33333333-3333-4333-8333-333333333330",
      targetDistanceM: null,
      targetWeightKg: null,
    });
    expect(draft.days[0]!.sections[0]!.prescriptions[0]!.catalogExerciseId).toBe(
      "44444444-4444-4444-8444-444444444440",
    );
  });

  it("requires an exact movement-removal review and refuses to empty a section", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const oneRow = structuredClone(draft);
    oneRow.days[0]!.sections[0]!.prescriptions.splice(1);

    const oneRowReview = reviewProgramPrescriptionRemoval(
      oneRow,
      0,
      0,
      0,
      "Exercise 1",
    );
    expect(() => removeProgramPrescription(oneRow, 0, 0, 0, {
      ...oneRowReview,
      confirmed: true,
    })).toThrow(/last movement/i);

    const review = reviewProgramPrescriptionRemoval(draft, 0, 0, 1, "Exercise 2");
    expect(() => removeProgramPrescription(draft, 0, 0, 1, review)).toThrow(/confirm/i);
    expect(() => removeProgramPrescription(draft, 0, 0, 0, {
      ...review,
      confirmed: true,
    })).toThrow(/stale/i);
    const removed = removeProgramPrescription(draft, 0, 0, 1, {
      ...review,
      confirmed: true,
    });
    expect(removed.days[0]!.sections[0]!.prescriptions).toHaveLength(1);
    expect(draft.days[0]!.sections[0]!.prescriptions).toHaveLength(2);

    expect(review).toEqual({
      confirmed: false,
      exerciseName: "Exercise 2",
      prescriptionKey: draft.days[0]!.sections[0]!.prescriptions[1]!.prescriptionKey,
      sectionKey: draft.days[0]!.sections[0]!.sectionKey,
    });
  });

  it("filters compatible candidates by bounded text", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");

    const custom = candidate({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      kind: "custom",
      name: "Private cable row",
      requiredEquipment: ["dumbbells"],
      role: null,
      searchText: "private cable row back dumbbells",
    });
    expect(filterProgramExerciseCandidates([candidate(), custom], " BACK   ")).toEqual([custom]);
    expect(filterProgramExerciseCandidates([candidate(), custom], "x".repeat(121))).toEqual([]);
    expect(draft.days[0]!.displayName).toBe("Push");
  });

  it("blocks a distance-duration selection until it has a positive distance target", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const distance = candidate({
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      loggingKind: "distance_duration",
      name: "Loaded carry",
      role: null,
    });
    const next = addProgramPrescription(
      draft,
      0,
      0,
      programMovementSelectionFromCandidate(distance),
    );
    const candidates = [
      candidate({ id: "44444444-4444-4444-8444-444444444440" }),
      candidate({ id: "44444444-4444-4444-8444-444444444441" }),
      distance,
    ];

    expect(validateProgramExerciseSelections(next, candidates)).toEqual([
      "Loaded carry needs a positive distance target before publication.",
    ]);
    next.days[0]!.sections[0]!.prescriptions.at(-1)!.targetDistanceM = 500;
    expect(validateProgramExerciseSelections(next, candidates)).toEqual([]);
  });

  it("resolves catalog and custom selections by kind when their UUIDs collide", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const collidingId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const catalog = candidate({
      id: collidingId,
      kind: "catalog",
      name: "Catalog press",
    });
    const custom = candidate({
      id: collidingId,
      kind: "custom",
      loggingKind: "distance_duration",
      name: "Private carry",
      role: null,
    });
    const available = [
      candidate({ id: "44444444-4444-4444-8444-444444444440" }),
      candidate({ id: "44444444-4444-4444-8444-444444444441" }),
      catalog,
      custom,
    ];

    const customDraft = addProgramPrescription(
      draft,
      0,
      0,
      programMovementSelectionFromCandidate(custom),
    );
    expect(validateProgramExerciseSelections(customDraft, available)).toEqual([
      "Private carry needs a positive distance target before publication.",
    ]);

    const catalogDraft = addProgramPrescription(
      draft,
      0,
      0,
      programMovementSelectionFromCandidate(catalog),
    );
    expect(validateProgramExerciseSelections(catalogDraft, available)).toEqual([]);
    expect(validateProgramExerciseSelections(customDraft, available.filter((candidate) => candidate.kind === "catalog"))).toEqual([
      "A selected movement is no longer available.",
    ]);
  });

  it("strips only client-local prescription identifiers before publication", () => {
    const draft = programPublishInputFromReadModel(programReadModel(), "publish-key");
    const localId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const added = addProgramPrescription(draft, 0, 0, selection());
    added.days[0]!.sections[0]!.prescriptions.at(-1)!.sourcePrescriptionId = localId;

    const publishable = stripLocalProgramPrescriptionIds(added, new Set([localId]));

    expect(publishable).not.toBe(added);
    expect(publishable.days[0]!.sections[0]!.prescriptions.at(-1)!.sourcePrescriptionId).toBeNull();
    expect(publishable.days[0]!.sections[0]!.prescriptions[0]!.sourcePrescriptionId).toBe(
      "33333333-3333-4333-8333-333333333330",
    );
    expect(added.days[0]!.sections[0]!.prescriptions.at(-1)!.sourcePrescriptionId).toBe(localId);
  });
});
