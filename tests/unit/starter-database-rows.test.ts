import { describe, expect, it } from "vitest";

import { buildStarterDatabaseRows } from "@/domain/seed/starter-database-rows";
import { buildStarterDatabaseSeed } from "@/domain/seed/starter-database";

const UUID_V5 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("starter database seed rows", () => {
  it("maps the canonical manifest to a stable, fully linked relational graph", () => {
    const manifest = buildStarterDatabaseSeed();
    const rows = buildStarterDatabaseRows();

    expect(rows).toEqual(buildStarterDatabaseRows());
    expect(rows.catalogEquipment).toHaveLength(manifest.equipment.length);
    expect(rows.catalogExercises).toHaveLength(manifest.exercises.length);
    expect(rows.exerciseEquipment).toHaveLength(manifest.exerciseEquipment.length);
    expect(rows.exerciseAliases).toHaveLength(manifest.exerciseAliases.length);
    expect(rows.programTemplateRevisions).toHaveLength(2);
    expect(rows.templateDays).toHaveLength(10);
    expect(rows.templateSections).toHaveLength(26);
    expect(rows.templatePrescriptions).toHaveLength(60);
    expect(rows.templateCardioPrescriptions).toHaveLength(20);

    const allIds = [
      ...rows.catalogExercises.map(({ id }) => id),
      ...rows.exerciseAliases.map(({ id }) => id),
      rows.programTemplate.id,
      ...rows.programTemplateRevisions.map(({ id }) => id),
      ...rows.templateDays.map(({ id }) => id),
      ...rows.templateSections.map(({ id }) => id),
      ...rows.templatePrescriptions.map(({ id }) => id),
      ...rows.templateCardioPrescriptions.map(({ id }) => id),
    ];
    expect(allIds.every((id) => UUID_V5.test(id))).toBe(true);
    expect(new Set(allIds).size).toBe(allIds.length);

    const exerciseIds = new Set(rows.catalogExercises.map(({ id }) => id));
    const revisionIds = new Set(rows.programTemplateRevisions.map(({ id }) => id));
    const dayIds = new Set(rows.templateDays.map(({ id }) => id));
    const sectionIds = new Set(rows.templateSections.map(({ id }) => id));

    expect(rows.exerciseEquipment.every(({ exerciseId }) => exerciseIds.has(exerciseId))).toBe(
      true,
    );
    expect(rows.exerciseAliases.every(({ exerciseId }) => exerciseIds.has(exerciseId))).toBe(
      true,
    );
    expect(
      rows.templateDays.every(({ revisionId }) => revisionIds.has(revisionId)),
    ).toBe(true);
    expect(
      rows.templateSections.every(
        ({ dayId, revisionId }) => dayIds.has(dayId) && revisionIds.has(revisionId),
      ),
    ).toBe(true);
    expect(
      rows.templatePrescriptions.every(
        ({ exerciseId, revisionId, sectionId }) =>
          exerciseIds.has(exerciseId) &&
          revisionIds.has(revisionId) &&
          sectionIds.has(sectionId),
      ),
    ).toBe(true);
    expect(
      rows.templateCardioPrescriptions.every(
        ({ dayId, revisionId }) => dayIds.has(dayId) && revisionIds.has(revisionId),
      ),
    ).toBe(true);
  });

  it("publishes both equipment revisions without inventing video approvals or loads", () => {
    const rows = buildStarterDatabaseRows();

    expect(
      rows.programTemplateRevisions.map(({ equipmentProfileKind, revisionNumber, status }) => ({
        equipmentProfileKind,
        revisionNumber,
        status,
      })),
    ).toEqual([
      { equipmentProfileKind: "dumbbells", revisionNumber: 1, status: "published" },
      { equipmentProfileKind: "barbell", revisionNumber: 2, status: "published" },
    ]);
    expect(
      new Set(rows.programTemplateRevisions.map(({ publishedAt }) => publishedAt)),
    ).toEqual(new Set(["2026-08-25T00:00:00.000Z"]));
    expect(rows.templatePrescriptions.every(({ targetWeightKg }) => targetWeightKg === null)).toBe(
      true,
    );
    expect(rows.curatedVideos).toEqual([]);

    const dumbbellRevision = rows.programTemplateRevisions.find(
      ({ equipmentProfileKind }) => equipmentProfileKind === "dumbbells",
    );
    const dumbbellLower = rows.templateDays.find(
      ({ dayKey, revisionId }) =>
        dayKey === "lower" && revisionId === dumbbellRevision?.id,
    );
    const lowerSections = rows.templateSections.filter(
      ({ dayId }) => dayId === dumbbellLower?.id,
    );
    const lowerPrescription = rows.templatePrescriptions.find(
      ({ displayName, sectionId }) =>
        displayName === "Heavy goblet squat" &&
        lowerSections.some(({ id }) => id === sectionId),
    );
    expect(lowerPrescription).toBeDefined();
  });
});
