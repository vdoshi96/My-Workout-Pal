import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PersonalRecordsView } from "@/components/insights/personal-records-view";
import { ProgressInsightsView } from "@/components/insights/progress-insights-view";
import { TrainingHistoryDetail } from "@/components/insights/training-history-detail";
import type {
  PersonalRecordView,
  ProgressInsightsReadModel,
  TrainingSessionDetail,
} from "@/server/repositories/training-insights";

const records: readonly PersonalRecordView[] = [
  {
    achievedAt: new Date("2026-08-26T18:00:00.000Z"),
    calculationVersions: ["personal-record-v1"],
    exerciseName: "Dumbbell bench press",
    hasMoreSources: true,
    isTie: true,
    sourceSessionIds: [
      "10000000-0000-4000-8000-000000000001",
      "10000000-0000-4000-8000-000000000002",
    ],
    sourceSetLogIds: [
      "20000000-0000-4000-8000-000000000001",
      "20000000-0000-4000-8000-000000000002",
    ],
    totalTieCount: 21,
    type: "max_weight",
    value: 11.34,
  },
];

const progress: ProgressInsightsReadModel = {
  preferences: { timezone: "America/Chicago", unitSystem: "imperial" },
  projection: { calculationVersions: [], generatedAt: undefined, state: "derived" },
  series: [
    {
      date: "2026-08-26",
      distanceMeters: 1609.344,
      durationSeconds: 1200,
      estimatedOneRepMaxKg: 15.876,
      sessionCount: 1,
      sourceIds: [
        "10000000-0000-4000-8000-000000000001",
        "10000000-0000-4000-8000-000000000002",
      ],
      volumeKg: 374.214,
    },
  ],
  scope: { maxSessions: 180, sessionCount: 1, truncated: false },
  totals: {
    abandonedSessions: 1,
    completedSessions: 1,
    distanceMeters: 1609.344,
    durationSeconds: 1200,
    volumeKg: 374.214,
  },
};

const historySession: TrainingSessionDetail = {
  cardio: {
    distanceMeters: 1_609.344,
    durationSeconds: 1_200,
    inclinePercent: 2,
    mode: "walker",
    notes: "Immutable pace note",
    paceSecondsPerKilometer: 450,
  },
  completedExerciseCount: 1,
  dayName: "Pull archive",
  durationSeconds: 1_800,
  exerciseCount: 1,
  exercises: [
    {
      displayName: "Weighted pull-up",
      equipmentProfileKind: "dumbbells",
      id: "30000000-0000-4000-8000-000000000001",
      loggingKind: "bodyweight_reps",
      maximumReps: 12,
      maximumSeconds: undefined,
      minimumReps: 8,
      minimumSeconds: undefined,
      note: undefined,
      position: 1,
      prescriptionNote: "Keep the ribcage stacked.",
      restSeconds: 90,
      sectionTitle: "Pull strength",
      sectionKind: "strength",
      setCount: 2,
      setKind: "work",
      sets: [
        {
          addedWeightKg: 5,
          distanceMeters: undefined,
          durationSeconds: undefined,
          formRating: 5,
          id: "40000000-0000-4000-8000-000000000001",
          kind: "bodyweight_reps",
          note: undefined,
          position: 1,
          recordedAt: new Date("2026-08-26T18:00:00.000Z"),
          repetitions: 10,
          setKind: "work",
          weightKg: undefined,
        },
      ],
      status: "completed",
      substitutionReason: undefined,
      targetDistanceMeters: undefined,
      targetWeightKg: undefined,
    },
  ],
  id: "10000000-0000-4000-8000-000000000001",
  occurredAt: new Date("2026-08-26T18:30:00.000Z"),
  setCount: 1,
  startedAt: new Date("2026-08-26T18:00:00.000Z"),
  state: "completed",
};

describe("shared persisted training-insight views", () => {
  it("renders tied records with owned source links and selected display units", () => {
    const markup = renderToStaticMarkup(
      <PersonalRecordsView
        records={records}
        timezone="America/Chicago"
        unitSystem="imperial"
      />,
    );

    expect(markup).toContain("Personal records");
    expect(markup).toContain("25 lb");
    expect(markup).toContain("Tied best · 21 exact source sets");
    expect(markup).toContain("Showing sources from the newest 2 tied sets");
    expect(markup).toContain("/app/history/10000000-0000-4000-8000-000000000001");
    expect(markup).not.toContain("sample");
  });

  it("renders completed-log totals and source navigation without hiding excluded sessions", () => {
    const markup = renderToStaticMarkup(<ProgressInsightsView progress={progress} />);

    expect(markup).toContain("Progress");
    expect(markup).toContain("825 lb·reps");
    expect(markup).toContain("1 mi");
    expect(markup).toContain("Logged distance");
    expect(markup).not.toContain("Cardio distance");
    expect(markup).toContain("Abandoned");
    expect(markup).toContain("resumable workouts return through the runner");
    expect(markup).toContain("1 interrupted workout is excluded");
    expect(markup).toContain("Timeline includes all 1 completed workout");
    expect(markup).toContain("/app/history/10000000-0000-4000-8000-000000000001");
    expect(markup).toContain("Open saved workout 1 of 2 from Aug 26");
    expect(markup).toContain("Open saved workout 2 of 2 from Aug 26");
    expect(markup).not.toContain("sample");
  });

  it("discloses a bounded timeline without understating all-time totals", () => {
    const markup = renderToStaticMarkup(
      <ProgressInsightsView
        progress={{
          ...progress,
          scope: { maxSessions: 180, sessionCount: 183, truncated: true },
        }}
      />,
    );

    expect(markup).toContain("Showing the newest 180 of 183 completed workouts");
    expect(markup).toContain("All-time totals above include all 183");
  });

  it("renders the complete immutable prescription, added load, and cardio pace", () => {
    const markup = renderToStaticMarkup(
      <TrainingHistoryDetail
        session={historySession}
        timezone="UTC"
        unitSystem="imperial"
      />,
    );

    expect(markup).toContain("10 bodyweight reps · 11 lb added");
    expect(markup).toContain("2 work sets");
    expect(markup).toContain("8–12 reps");
    expect(markup).toContain("1m 30s");
    expect(markup).toContain("12:04 / mi");
    expect(markup).toContain("Keep the ribcage stacked.");
    expect(markup).toContain("Pull strength · completed");
  });
});
