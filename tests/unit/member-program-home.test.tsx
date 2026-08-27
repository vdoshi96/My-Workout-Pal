import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { MemberProgramHome } from "@/components/program/member-program-home";
import type { ActiveProgramReadModel } from "@/server/repositories/profile-program";

const prescription = {
  id: "10000000-0000-4000-8000-000000000001",
  prescriptionKey: "90000000-0000-4000-8000-000000000001",
  catalogExerciseId: "20000000-0000-4000-8000-000000000001",
  customExerciseId: null,
  exercise: {
    id: "20000000-0000-4000-8000-000000000001",
    slug: "dumbbell-bench-press",
    name: "Dumbbell bench press",
    movementFamily: "horizontal_push",
    loggingKind: "weight_reps" as const,
    role: "compound" as const,
    kind: "catalog" as const,
    requiredEquipment: ["dumbbells", "bench"] as const,
  },
  customExercise: null,
  displayName: null,
  label: "Dumbbell bench press",
  displayOrder: 1,
  setKind: "work" as const,
  setCount: 3,
  measurementKind: "weight_reps" as const,
  minimumReps: 8,
  maximumReps: 12,
  minimumSeconds: null,
  maximumSeconds: null,
  restSeconds: 90,
  targetWeightKg: null,
  targetDistanceM: null,
  notes: null,
  targetMetadata: {},
};

const section = {
  id: "30000000-0000-4000-8000-000000000001",
  sectionKey: "90000000-0000-4000-8000-000000000002",
  kind: "strength" as const,
  displayOrder: 1,
  title: "Strength route",
  prescriptions: [prescription],
};

const program: ActiveProgramReadModel = {
  id: "40000000-0000-4000-8000-000000000001",
  programKey: "flexible-member-home",
  name: "Flexible member route",
  equipmentProfileKind: "dumbbells",
  revisionId: "50000000-0000-4000-8000-000000000001",
  revisionNumber: 3,
  status: "published",
  publishedAt: "2026-08-26T00:00:00.000Z",
  sourceTemplateRevisionId: null,
  days: [
    {
      id: "60000000-0000-4000-8000-000000000001",
      dayNumber: 1,
      dayKey: "70000000-0000-4000-8000-000000000001",
      displayName: "Mobility",
      sections: [section],
      prescriptions: [prescription],
      cardio: [],
    },
    {
      id: "60000000-0000-4000-8000-000000000002",
      dayNumber: 2,
      dayKey: "70000000-0000-4000-8000-000000000002",
      displayName: "Trail",
      sections: [section],
      prescriptions: [prescription],
      cardio: [{
        id: "80000000-0000-4000-8000-000000000001",
        cardioKey: "90000000-0000-4000-8000-000000000003",
        mode: "runner",
        durationSeconds: 900,
        distanceM: null,
        paceSecondsPerKm: null,
        inclinePercent: null,
        notes: null,
      }],
    },
  ],
};

describe("MemberProgramHome", () => {
  it("describes the actual day and cardio topology", () => {
    const markup = renderToStaticMarkup(
      <MemberProgramHome canMutate initialProgram={program} />,
    );

    expect(markup).toContain("Revision 3 · Dumbbells · 2 days");
    expect(markup).toContain("1 movements · no cardio");
    expect(markup).toContain("1 movements · 1 cardio option");
    expect(markup).not.toContain("five days");
    expect(markup).not.toContain("walker or runner");
  });
});
