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
    completedWorkSets: 3,
    repetitions: 32,
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
  it.each([false, true])("labels unfinished interrupted movements honestly (saved set: %s)", (hasSets) => {
    const exercise = historySession.exercises[0]!;
    const markup = renderToStaticMarkup(
      <TrainingHistoryDetail
        session={{
          ...historySession, state: "abandoned", completedExerciseCount: 0,
          exercises: [{ ...exercise, status: "pending", sets: hasSets ? exercise.sets : [] }],
        }}
        timezone="UTC"
        unitSystem="metric"
      />,
    );
    expect(markup).toContain("Not finished");
    expect(markup).not.toContain("Read-only snapshot.");
    expect(markup).toContain("Pull strength · unfinished");
    expect(markup).not.toContain("pending");
    if (hasSets) expect(markup).toContain("10 bodyweight reps");
    else expect(markup).toContain("No sets were logged for this unfinished movement.");
  });

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
    expect(markup).toContain("Tied best (21 times)");
    expect(markup).toContain("Showing sources from the newest 2 tied sets");
    expect(markup).toContain("/app/history/10000000-0000-4000-8000-000000000001");
    expect(markup).not.toContain("sample");
  });

  it("renders completed-log totals and source navigation without hiding excluded sessions", () => {
    const markup = renderToStaticMarkup(<ProgressInsightsView progress={progress} />);

    expect(markup).toContain("Progress");
    expect(markup).toContain("825 lb·reps");
    expect(markup).toContain("1 mi");
    expect(markup).toContain("<dt>Distance</dt>");
    expect(markup).not.toContain("Cardio distance");
    expect(markup).toContain("Workouts you didn&#x27;t finish stay in History");
    expect(markup).toContain("<dt>Sets</dt><dd>3</dd>");
    expect(markup).toContain("<dt>Reps</dt><dd>32</dd>");
    expect(markup).not.toContain("Showing your newest");
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

    expect(markup).toContain("Showing your newest 180 of 183 completed workouts");
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

  it("celebrates a just-finished workout with its summary, new records and a way back to Today", () => {
    const markup = renderToStaticMarkup(
      <TrainingHistoryDetail
        back={{ href: "/app?day=pull", label: "Back to Today" }}
        celebration={{ records }}
        session={historySession}
        timezone="UTC"
        unitSystem="imperial"
      />,
    );

    expect(markup).toContain("Workout done! Nice work.");
    expect(markup.match(/<h1\b/g)).toHaveLength(1);
    expect(markup).toContain('<h2 id="history-detail-title">Pull archive</h2>');
    expect(markup).toContain("1 set · 10 reps · 110.2 lb·reps lifted");
    expect(markup).toContain("New record!");
    expect(markup).toContain("Dumbbell bench press: heaviest weight, 25 lb");
    expect(markup.match(/<i><\/i>/g)).toHaveLength(14);
    expect(markup).toContain('href="/app?day=pull"');
    expect(markup).toContain('href="/app/progress"');
    expect(markup).not.toContain("pal-back-link");
  });

  it("shows a plain detail page without the celebration", () => {
    const markup = renderToStaticMarkup(
      <TrainingHistoryDetail session={historySession} timezone="UTC" unitSystem="imperial" />,
    );

    expect(markup).not.toContain("Workout done!");
    expect(markup).not.toContain("pal-confetti");
    expect(markup).toContain('<h1 id="history-detail-title">Pull archive</h1>');
    expect(markup).toContain("Back to History");
  });

  it("marks only the newest of several records", () => {
    const older = { ...records[0]!, achievedAt: new Date("2026-08-01T18:00:00.000Z"), isTie: false, sourceSetLogIds: ["20000000-0000-4000-8000-000000000009"], type: "max_repetitions" as const, value: 12 };
    const markup = renderToStaticMarkup(
      <PersonalRecordsView records={[older, records[0]!]} timezone="UTC" unitSystem="imperial" />,
    );
    expect(markup.match(/>Newest</g)).toHaveLength(1);
    expect(renderToStaticMarkup(<PersonalRecordsView records={records} timezone="UTC" unitSystem="imperial" />)).not.toContain(">Newest<");
  });
});
