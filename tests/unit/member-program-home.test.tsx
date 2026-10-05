import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const address = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(address.search),
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
  afterEach(() => { address.search = ""; });

  const emptyProgress = {
    completedSessions: 0,
    distanceMeters: 0,
    durationSeconds: 0,
    unitSystem: "imperial" as const,
    volumeKg: 0,
  };

  it("renders a personal ready home with owned actions and no sample values", () => {
    const markup = renderToStaticMarkup(
      <MemberProgramHome
        canMutate
        displayName="Alice QA"
        initialProgram={program}
        progress={emptyProgress}
        resumableWorkout={null}
      />,
    );

    expect(markup).toContain("Hey Alice! Ready for Mobility?");
    expect(markup).toContain("1 movement · Dumbbells");
    expect(markup).toContain("2 days a week");
    expect(markup).toContain("<small>Day 1</small><strong>Mobility</strong>");
    expect(markup).toContain('href="/app/program/70000000-0000-4000-8000-000000000001?from=');
    expect(markup).not.toContain("Open Mobility to start");
    expect(markup).not.toContain('aria-label="Open Mobility to start"');
    expect(markup).not.toContain("Edit routine");
    expect(markup).not.toContain("Manage routines");
    expect(markup).not.toContain('href="/app/library"');
    expect(markup).not.toContain(" Library</a>");
    expect(markup).not.toContain('href="/app/history"');
    expect(markup).not.toContain('href="/app/progress"');
    expect(markup).not.toContain("No completed workouts yet");
    expect(markup).toContain("Start Mobility");
    expect(markup).not.toContain("Sample");
    expect(markup).not.toContain("five days");
    expect(markup).not.toContain("walker or runner");
    expect(markup).toContain('data-scene="pip"');
    expect(markup).toContain(
      'src="/illustrations/quiet-set/pip-studio.webp"',
    );
  });

  it("selects the day named in the address, even over a stale server render", () => {
    address.search = "?day=70000000-0000-4000-8000-000000000002";
    const markup = renderToStaticMarkup(
      <MemberProgramHome
        canMutate
        displayName="Alice QA"
        initialDayKey={null}
        initialProgram={program}
        progress={emptyProgress}
        resumableWorkout={null}
      />,
    );

    expect(markup).toContain("Hey Alice! Ready for Trail?");
    expect(markup).toContain('aria-pressed="true" class="pal-day-pill" type="button"><small>Day 2</small><strong>Trail</strong>');
    expect(markup).toContain('aria-pressed="false" class="pal-day-pill" type="button"><small>Day 1</small><strong>Mobility</strong>');
  });

  it("makes resume dominant and removes competing start links", () => {
    const markup = renderToStaticMarkup(
      <MemberProgramHome
        canMutate
        displayName="Alice QA"
        initialProgram={program}
        progress={{ ...emptyProgress, completedSessions: 2, volumeKg: 1200 }}
        resumableWorkout={{
          dayName: "Trail",
          sessionId: "aaaaaaaa-0000-4000-8000-000000000001",
          state: "active",
        }}
      />,
    );

    expect(markup).toContain("Keep going with Trail");
    expect(markup).toContain("Resume Trail");
    expect(markup).toContain('href="/workout/aaaaaaaa-0000-4000-8000-000000000001"');
    expect(markup).toContain("finish it before starting another day.");
    expect(markup).not.toContain("Start Mobility");
    expect(markup).not.toContain("Open Mobility to start");
    expect(markup).not.toContain("Manage routines");
    expect(markup).toContain('data-scene="pip"');
  });

  it("keeps an unverified routine readable without offering permanent workout actions", () => {
    const markup = renderToStaticMarkup(
      <MemberProgramHome
        canMutate={false}
        displayName="Alice QA"
        initialProgram={program}
        progress={emptyProgress}
        resumableWorkout={null}
      />,
    );

    expect(markup).toContain("Your routine is ready to look through.");
    expect(markup).toContain("Verify your email and sign in again to start or edit workouts.");
    expect(markup).not.toContain("Open Mobility to start");
    expect(markup).toContain("<small>Day 1</small><strong>Mobility</strong>");
    expect(markup).toContain('href="/app/program/70000000-0000-4000-8000-000000000001?from=');
    expect(markup).not.toContain("Edit routine");
    expect(markup).toContain('data-scene="pip"');
  });

  it("keeps an unverified resumable workout discoverable without enabling a new start", () => {
    const markup = renderToStaticMarkup(
      <MemberProgramHome
        canMutate={false}
        displayName="Alice QA"
        initialProgram={program}
        progress={emptyProgress}
        resumableWorkout={{
          dayName: "Trail",
          sessionId: "aaaaaaaa-0000-4000-8000-000000000001",
          state: "draft",
        }}
      />,
    );

    expect(markup).toContain("Verify to resume Trail");
    expect(markup).toContain("Review Trail");
    expect(markup).toContain('href="/workout/aaaaaaaa-0000-4000-8000-000000000001"');
    expect(markup).not.toContain("Open Mobility to start");
    expect(markup).toContain('href="/app/program/70000000-0000-4000-8000-000000000001?from=');
    expect(markup).not.toContain("Start Mobility");
  });
});
