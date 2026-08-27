import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const fixtureRoot = resolve(repositoryRoot, "tests/fixtures/authenticated-app");

function source(relativePath: string): string {
  return readFileSync(resolve(fixtureRoot, relativePath), "utf8");
}

describe("authenticated customization fixture boundary", () => {
  it("mounts the real private pages in the PGlite fixture", () => {
    const requiredPages = [
      "app/app/programs/page.tsx",
      "app/app/program/edit/page.tsx",
      "app/app/library/page.tsx",
      "app/app/library/custom/page.tsx",
      "app/app/library/custom/new/page.tsx",
      "app/app/library/custom/[id]/page.tsx",
      "app/app/settings/page.tsx",
      "app/app/prs/page.tsx",
      "app/app/progress/page.tsx",
      "app/app/history/page.tsx",
      "app/app/history/[sessionId]/page.tsx",
    ];

    expect(requiredPages.filter((relativePath) => existsSync(resolve(fixtureRoot, relativePath)))).toEqual(
      requiredPages,
    );

    expect(source("app/app/programs/page.tsx")).toContain("<ProgramCollection");
    expect(source("app/app/program/edit/page.tsx")).toContain("<ProgramEditor");
    expect(source("app/app/program/edit/page.tsx")).toContain("loadProgramEditorReadModel");
    expect(source("app/app/program/edit/page.tsx")).toContain(
      "unitSystem={data.model.preferences.unitSystem}",
    );
    expect(source("app/app/library/custom/new/page.tsx")).toContain("<CustomExerciseEditor");
    expect(source("app/app/library/custom/[id]/page.tsx")).toContain("<CustomExerciseEditor");
    expect(source("app/app/settings/page.tsx")).toContain("<SettingsForm");
    expect(source("app/app/settings/page.tsx")).toContain("firebaseConfig={null}");
    expect(source("app/app/prs/page.tsx")).toContain("<PersonalRecordsView");
    expect(source("app/app/progress/page.tsx")).toContain("<ProgressInsightsView");
    expect(source("app/app/history/[sessionId]/page.tsx")).toContain("<TrainingHistoryDetail");
    expect(source("app/app/library/page.tsx").match(/prefetch=\{false\}/gu)).toHaveLength(1);

    for (const relativePath of requiredPages) {
      const page = source(relativePath);
      expect(page).toContain("harnessRequestContext");
      expect(page).toContain('export const dynamic = "force-dynamic"');
    }

    for (const relativePath of requiredPages.filter(
      (candidate) => candidate !== "app/app/library/custom/new/page.tsx",
    )) {
      expect(source(relativePath)).toContain("getHarnessDatabase");
    }
  });

  it("keeps visible collection and editor boundaries aligned with the server contract", () => {
    const collection = readFileSync(
      resolve(repositoryRoot, "src/components/program/program-collection.tsx"),
      "utf8",
    );
    const styles = readFileSync(resolve(repositoryRoot, "src/app/globals.css"), "utf8");
    const editor = readFileSync(
      resolve(repositoryRoot, "src/components/program/program-editor.tsx"),
      "utf8",
    );
    const equipmentControlPath = resolve(
      repositoryRoot,
      "src/components/program/equipment-profile-control.tsx",
    );

    expect(collection.match(/maxLength=\{80\}/gu)).toHaveLength(2);
    expect(styles).toMatch(
      /\.program-editor-section-actions button, \.program-editor-add-section button \{[^}]*min-height: 2\.75rem;/u,
    );
    expect(styles).toMatch(
      /\.program-editor-prescription-actions button, \.program-editor-add \{[^}]*min-height: 2\.75rem;/u,
    );
    expect(editor).toContain('aria-label={`Move ${movementLabel} up`}');
    expect(editor).toContain('aria-label={`Move ${movementLabel} down`}');
    expect(editor).toContain('aria-label={`Replace ${movementLabel}`}');
    expect(editor).toContain('aria-label={`Remove ${movementLabel}`}');
    expect(existsSync(equipmentControlPath)).toBe(true);
    const equipmentControl = readFileSync(equipmentControlPath, "utf8");
    expect(editor).toContain("<EquipmentProfileControl");
    expect(editor).not.toContain('href="/app#equipment-profile"');
    expect(equipmentControl).toContain("previewOwnedEquipmentChange");
    expect(equipmentControl).toContain("draftDirty");
    expect(equipmentControl).toContain("Resolve incompatible custom movements first.");
    expect(equipmentControl).toContain("aria-controls");
    expect(equipmentControl).toContain("aria-expanded");
    expect(equipmentControl).toContain("reviewHeading.current?.focus()");
  });

  it("applies the complete checked-in migration inventory", () => {
    const databaseBootstrap = source("server/database.ts");
    expect(databaseBootstrap.match(/"000[0-4]_[^"]+\.sql"/gu)).toEqual([
      '"0000_initial.sql"',
      '"0001_account_deletion_saga.sql"',
      '"0002_workout_canonical_measurements.sql"',
      '"0003_program_collection.sql"',
      '"0004_personal_record_projection_checkpoint.sql"',
    ]);
  });

  it("adapts private mutations with production schemas and owner-scoped repositories", () => {
    const requiredAdapters = [
      "app/api/app/programs/route.ts",
      "app/api/app/programs/activate/route.ts",
      "app/api/app/program/publish/route.ts",
      "app/api/app/profile-program/equipment/route.ts",
      "app/api/app/custom-exercises/route.ts",
      "app/api/app/custom-exercises/[id]/route.ts",
      "app/api/app/preferences/route.ts",
    ];

    expect(
      requiredAdapters.filter((relativePath) => existsSync(resolve(fixtureRoot, relativePath))),
    ).toEqual(requiredAdapters);

    for (const relativePath of requiredAdapters) {
      const adapter = source(relativePath);
      expect(adapter).toContain("assertHarnessMutationRequest");
      expect(adapter).toContain("readBoundedJson");
      expect(adapter).toContain("privateJson");
      expect(adapter).toContain("harnessRequestContext");
    }

    expect(source("app/api/app/programs/route.ts")).toContain(
      "programCollectionMutationRequestSchema",
    );
    expect(source("app/api/app/programs/route.ts")).toContain("createViewerProgramFromStarter");
    expect(source("app/api/app/programs/route.ts")).toContain("cloneViewerProgram");
    expect(source("app/api/app/programs/activate/route.ts")).toContain(
      "activateProgramRequestSchema",
    );
    expect(source("app/api/app/programs/activate/route.ts")).toContain("activateViewerProgram");
    expect(source("app/api/app/program/publish/route.ts")).toContain(
      "programPublishRequestSchema",
    );
    expect(source("app/api/app/program/publish/route.ts")).toContain("publishViewerProgram");
    expect(source("app/api/app/profile-program/equipment/route.ts")).toContain(
      "equipmentChangeRequestSchema",
    );
    expect(source("app/api/app/profile-program/equipment/route.ts")).toContain(
      "confirmEquipmentChange",
    );
    expect(source("app/api/app/preferences/route.ts")).toContain(
      "preferencesUpdateRequestSchema",
    );
    expect(source("app/api/app/preferences/route.ts")).toContain("updateViewerPreferences");
    expect(source("app/api/app/custom-exercises/route.ts")).toContain(
      "createCustomExerciseRequestSchema",
    );
    expect(source("app/api/app/custom-exercises/route.ts")).toContain("createCustomExercise");
    expect(source("app/api/app/custom-exercises/route.ts")).toContain("listCustomExercises");
    expect(source("app/api/app/custom-exercises/[id]/route.ts")).toContain(
      "updateCustomExerciseRequestSchema",
    );
    expect(source("app/api/app/custom-exercises/[id]/route.ts")).toContain("getCustomExercise");
    expect(source("app/api/app/custom-exercises/[id]/route.ts")).toContain("updateCustomExercise");
    expect(source("app/api/app/custom-exercises/[id]/route.ts")).toContain("deleteCustomExercise");
  });
});
