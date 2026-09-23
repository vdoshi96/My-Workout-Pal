// Acceptance contract for docs/plans/PRODUCTION-GRADE-IMPLEMENTATION.md.
// Do not edit these expectations to make them pass; implement the plan instead.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import {
  formatProgramDraftIssue,
  type ProgramEditorDraft,
} from "@/components/program/program-editor-model";
import { setEntryErrorMessage } from "@/components/workout/workout-runner-presenters";
import { signInRedirectPath } from "@/domain/navigation/member-return";
import { formatClockDuration, parseClockDuration } from "@/domain/time-entry";
import { timeZoneOptions } from "@/domain/time-zones";
import {
  RunnerTransitionError,
  createRunnerState,
  createSetDraft,
  createWorkoutSnapshot,
  getFailedOperations,
  isNavigationBlocked,
  navigationProtectionReason,
  prefilledSetDraft,
  runnerReducer,
  type ActiveWorkoutState,
  type RunnerSnapshotInput,
} from "@/domain/workout-runner";

const root = join(import.meta.dirname, "../..");

const snapshotInput: RunnerSnapshotInput = {
  sessionId: "session-audit",
  ownerUid: "uid-audit",
  programRevisionId: "program-revision-1",
  dayId: "day-pull",
  dayName: "Pull",
  exercises: [
    {
      id: "exercise-row",
      name: "Chest-supported row",
      loggingKind: "weight_reps",
      sets: [
        {
          id: "row-warmup-1",
          position: 1,
          phase: "warmup",
          target: { kind: "weight_reps", targetWeightKg: 20, minimumReps: 8, maximumReps: 10, restSeconds: 45 },
          previous: { kind: "weight_reps", weightKg: 15, repetitions: 10 },
        },
        {
          id: "row-work-1",
          position: 2,
          phase: "work",
          target: { kind: "weight_reps", targetWeightKg: 32, minimumReps: 8, maximumReps: 12, restSeconds: 90 },
          previous: { kind: "weight_reps", weightKg: 30, repetitions: 10 },
        },
        {
          id: "row-work-2",
          position: 3,
          phase: "work",
          target: { kind: "weight_reps", targetWeightKg: 32, minimumReps: 8, maximumReps: 12, restSeconds: 90 },
        },
      ],
    },
    {
      id: "exercise-plank",
      name: "Side plank",
      loggingKind: "duration",
      sets: [
        {
          id: "plank-work-1",
          position: 1,
          phase: "work",
          target: { kind: "duration", minimumSeconds: 20, maximumSeconds: 45, restSeconds: 60 },
        },
      ],
    },
  ],
};

function makeState(now = 1_000): ActiveWorkoutState {
  return createRunnerState(createWorkoutSnapshot(snapshotInput), { now });
}

function logRowWork(state: ActiveWorkoutState, weightKg: number, repetitions: number): ActiveWorkoutState {
  const navigated = runnerReducer(state, { type: "navigate_set", index: 1 });
  const drafted = runnerReducer(navigated, {
    type: "update_set_draft",
    setId: "row-work-1",
    draft: { kind: "weight_reps", weightKg, repetitions },
  });
  return runnerReducer(drafted, { type: "save_set", setId: "row-work-1" });
}

function lastOperationKey(state: ActiveWorkoutState): string {
  const operation = [...state.operations].sort((left, right) => right.sequence - left.sequence)[0];
  if (!operation) throw new Error("expected an operation");
  return operation.idempotencyKey;
}

describe("runner: rest timer survives advancing (plan R4)", () => {
  it("keeps the running rest timer when moving to the next set", () => {
    let state = makeState(1_000);
    state = runnerReducer(state, {
      type: "update_set_draft",
      setId: "row-warmup-1",
      draft: { kind: "weight_reps", weightKg: 15, repetitions: 10 },
    });
    state = runnerReducer(state, { type: "log_set_and_rest", setId: "row-warmup-1", now: 1_000 });
    const timer = state.restTimer;
    expect(timer?.endsAt).toBe(46_000);
    state = runnerReducer(state, { type: "next_set", setId: "row-warmup-1", now: 2_000 });
    expect(state.currentSetIndex).toBe(1);
    expect(state.restTimer).toEqual(timer);
  });

  it("keeps the running rest timer when moving to the next exercise", () => {
    let state = makeState(1_000);
    for (const [index, setId] of ["row-warmup-1", "row-work-1", "row-work-2"].entries()) {
      state = runnerReducer(state, { type: "navigate_set", index });
      state = runnerReducer(state, {
        type: "update_set_draft",
        setId,
        draft: { kind: "weight_reps", weightKg: 30, repetitions: 10 },
      });
      state = runnerReducer(state, { type: "log_set_and_rest", setId, now: 1_000 + index });
    }
    const timer = state.restTimer;
    expect(timer).toBeDefined();
    state = runnerReducer(state, { type: "complete_exercise_and_next", exerciseId: "exercise-row", now: 3_000 });
    expect(state.currentExerciseIndex).toBe(1);
    expect(state.restTimer).toEqual(timer);
  });
});

describe("runner: set entry prefill (plan R12)", () => {
  it("prefills from the set's previous value when nothing was logged in this phase", () => {
    expect(prefilledSetDraft(makeState(), "row-work-1")).toEqual({ kind: "weight_reps", weightKg: 30, repetitions: 10 });
  });

  it("prefers the latest logged set of the same exercise and phase in this session", () => {
    const state = logRowWork(makeState(), 34, 9);
    expect(prefilledSetDraft(state, "row-work-2")).toEqual({ kind: "weight_reps", weightKg: 34, repetitions: 9 });
  });

  it("falls back to an empty draft", () => {
    expect(prefilledSetDraft(makeState(), "plank-work-1")).toEqual(createSetDraft("duration"));
  });

  it("applies the prefill as a clean draft when advancing, without marking it unsaved", () => {
    let state = makeState(1_000);
    state = runnerReducer(state, {
      type: "update_set_draft",
      setId: "row-warmup-1",
      draft: { kind: "weight_reps", weightKg: 15, repetitions: 10 },
    });
    state = runnerReducer(state, { type: "log_set_and_rest", setId: "row-warmup-1", now: 1_000 });
    state = runnerReducer(state, { type: "next_set", setId: "row-warmup-1", now: 2_000 });
    expect(state.drafts["row-work-1"]).toEqual({ kind: "weight_reps", weightKg: 30, repetitions: 10 });
    expect(state.dirtySetIds).not.toContain("row-work-1");
    expect(() => runnerReducer(state, { type: "save_set", setId: "row-work-1" })).not.toThrow();
  });
});

describe("runner: discarding a failed change (plan R2)", () => {
  it("removes a conflicted first save and unblocks leaving and finishing", () => {
    let state = logRowWork(makeState(), 32, 10);
    const key = lastOperationKey(state);
    state = runnerReducer(state, {
      type: "operation_failed",
      idempotencyKey: key,
      errorCode: "conflict",
      conflict: true,
      retryable: false,
    });
    expect(isNavigationBlocked(state)).toBe(true);
    expect(navigationProtectionReason(state)).toBe("A change couldn't be saved. Discard it or try again first.");

    state = runnerReducer(state, { type: "discard_failed_operation", idempotencyKey: key });
    expect(state.operations.find((operation) => operation.idempotencyKey === key)?.status).toBe("superseded");
    expect(state.loggedSets["row-work-1"]).toBeUndefined();
    expect(getFailedOperations(state)).toEqual([]);
    expect(isNavigationBlocked(state)).toBe(false);
    expect(navigationProtectionReason(state)).toBeUndefined();
  });

  it("restores the last value the server confirmed for the same set", () => {
    let state = logRowWork(makeState(), 32, 10);
    const firstKey = lastOperationKey(state);
    state = runnerReducer(state, { type: "operation_saved", idempotencyKey: firstKey, persistedId: "set-row-1" });
    state = runnerReducer(state, {
      type: "update_set_draft",
      setId: "row-work-1",
      draft: { kind: "weight_reps", weightKg: 34, repetitions: 8 },
    });
    state = runnerReducer(state, { type: "save_set", setId: "row-work-1" });
    const secondKey = lastOperationKey(state);
    state = runnerReducer(state, {
      type: "operation_failed",
      idempotencyKey: secondKey,
      errorCode: "server_rejected",
      failureKind: "permanent",
      retryable: false,
    });
    state = runnerReducer(state, { type: "discard_failed_operation", idempotencyKey: secondKey });
    expect(state.loggedSets["row-work-1"]?.operationKey).toBe(firstKey);
    expect(state.loggedSets["row-work-1"]?.measurement).toEqual({ kind: "weight_reps", weightKg: 32, repetitions: 10 });
    expect(isNavigationBlocked(state)).toBe(false);
  });

  it("refuses to discard pending changes and session-level failures", () => {
    const pending = logRowWork(makeState(), 32, 10);
    let pendingError: unknown;
    try {
      runnerReducer(pending, { type: "discard_failed_operation", idempotencyKey: lastOperationKey(pending) });
    } catch (error) {
      pendingError = error;
    }
    expect(pendingError).toBeInstanceOf(RunnerTransitionError);
    expect((pendingError as RunnerTransitionError).code).toBe("discard_not_allowed");

    let abandoning = runnerReducer(makeState(), { type: "abandon_session" });
    const abandonKey = lastOperationKey(abandoning);
    abandoning = runnerReducer(abandoning, {
      type: "operation_failed",
      idempotencyKey: abandonKey,
      errorCode: "server_rejected",
      failureKind: "permanent",
      retryable: false,
    });
    expect(() =>
      runnerReducer(abandoning, { type: "discard_failed_operation", idempotencyKey: abandonKey }),
    ).toThrow(RunnerTransitionError);
  });
});

describe("runner: leaving and finishing messages (plan R6, copy)", () => {
  it("allows leaving while saves are only pending because they are stored on the device", () => {
    const state = logRowWork(makeState(), 32, 10);
    expect(state.operations.some((operation) => operation.status === "pending")).toBe(true);
    expect(isNavigationBlocked(state)).toBe(false);
    expect(navigationProtectionReason(state)).toBeUndefined();
  });

  it("blocks leaving with an unsaved entry and says why in plain words", () => {
    const state = runnerReducer(makeState(), {
      type: "update_set_draft",
      setId: "row-warmup-1",
      draft: { kind: "weight_reps", weightKg: 15, repetitions: 10 },
    });
    expect(isNavigationBlocked(state)).toBe(true);
    expect(navigationProtectionReason(state)).toBe("You have an unsaved entry. Log it or clear it first.");
  });

  it("names the unfinished exercise when finishing too early", () => {
    expect(() => runnerReducer(makeState(), { type: "complete_session" })).toThrow("Finish or skip Chest-supported row first.");
  });
});

describe("runner presenters: set entry errors (plan R5)", () => {
  it.each([
    ["weight_reps", "Enter weight and reps to log this set."],
    ["bodyweight_reps", "Enter reps to log this set."],
    ["duration", "Enter a time to log this set."],
    ["distance_duration", "Enter distance and time to log this set."],
  ] as const)("%s", (kind, message) => {
    expect(setEntryErrorMessage(kind)).toBe(message);
  });
});

describe("clock entry (plan R13, P12)", () => {
  it.each([
    ["20:00", 1_200],
    ["1:05", 65],
    ["0:45", 45],
    ["1:05:00", 3_900],
    ["20", 1_200],
    [" 7:30 ", 450],
  ] as const)("parses %j", (input, seconds) => {
    expect(parseClockDuration(input)).toBe(seconds);
  });

  it.each(["", "abc", "1:60", "-5", "1::00", "12:3"])("rejects %j", (input) => {
    expect(parseClockDuration(input)).toBeUndefined();
  });

  it.each([
    [1_200, "20:00"],
    [65, "1:05"],
    [0, "0:00"],
    [3_900, "1:05:00"],
  ] as const)("formats %d", (seconds, text) => {
    expect(formatClockDuration(seconds)).toBe(text);
  });
});

describe("time zone choices (plan A13)", () => {
  it("offers sorted unique IANA zones and keeps an unlisted saved value", () => {
    const options = timeZoneOptions("Mars/Olympus_Mons");
    expect(options).toContain("America/Chicago");
    expect(options).toContain("UTC");
    expect(options).toEqual(expect.arrayContaining(Intl.supportedValuesOf("timeZone")));
    expect(timeZoneOptions("Asia/Kolkata")).toContain("Asia/Kolkata");
    expect(timeZoneOptions("America/Chicago")).toContain("America/Chicago");
    expect(options).toContain("Mars/Olympus_Mons");
    expect(new Set(options).size).toBe(options.length);
    const withoutSaved = options.filter((zone) => zone !== "Mars/Olympus_Mons");
    expect(withoutSaved).toEqual([...withoutSaved].sort((left, right) => left.localeCompare(right, "en-US")));
  });
});

describe("routine validation messages (plan E3)", () => {
  const draft = {
    days: [
      {
        name: "Push",
        sections: [
          { title: "Strength", prescriptions: [{ catalogExerciseId: "ex-bench", customExerciseId: null, displayName: null }] },
          { title: "Accessory", prescriptions: [{ catalogExerciseId: "ex-shoulder", customExerciseId: null, displayName: null }] },
        ],
        cardio: [],
      },
      { name: "Pull", sections: [], cardio: [] },
    ],
  } as unknown as ProgramEditorDraft;
  const names = new Map([
    ["ex-bench", "Dumbbell bench press"],
    ["ex-shoulder", "Seated dumbbell shoulder press"],
  ]);

  it("names the day and movement instead of a schema path", () => {
    expect(
      formatProgramDraftIssue(
        draft,
        { path: ["days", 0, "sections", 1, "prescriptions", 0], message: "Choose exactly one exercise reference." },
        names,
      ),
    ).toBe("Push › Seated dumbbell shoulder press: Choose exactly one exercise reference.");
  });

  it("uses a readable field label for field-level issues", () => {
    const text = formatProgramDraftIssue(
      draft,
      { path: ["days", 0, "sections", 0, "prescriptions", 0, "maximumReps"], message: "Too small: expected number to be >0" },
      names,
    );
    expect(text.startsWith("Push › Dumbbell bench press: Max reps")).toBe(true);
    expect(text).not.toMatch(/→|maximumReps|prescriptions|sections|days|expected number/);
  });

  it("falls back to the day and then the routine", () => {
    expect(formatProgramDraftIssue(draft, { path: ["days", 1, "name"], message: "Too small" }, names)).toMatch(/^Pull: Day name/);
    expect(formatProgramDraftIssue(draft, { path: [], message: "Add at least one day." }, names)).toBe("Routine: Add at least one day.");
  });
});

describe("sign-in return path (plan A8)", () => {
  it.each([
    ["/app/settings", "/sign-in?returnTo=%2Fapp%2Fsettings"],
    ["/app/history/abc?view=sets", "/sign-in?returnTo=%2Fapp%2Fhistory%2Fabc%3Fview%3Dsets"],
    ["/app", "/sign-in?returnTo=%2Fapp"],
    [null, "/sign-in?returnTo=%2Fapp"],
    ["", "/sign-in?returnTo=%2Fapp"],
    ["//evil.example/app", "/sign-in?returnTo=%2Fapp"],
    ["/application", "/sign-in?returnTo=%2Fapp"],
    ["/program", "/sign-in?returnTo=%2Fapp"],
    ["https://evil.example/app", "/sign-in?returnTo=%2Fapp"],
  ] as const)("%j", (requested, expected) => {
    expect(signInRedirectPath(requested)).toBe(expected);
  });
});

describe("installed app manifest (plan P13)", () => {
  const value = manifest();

  it("opens members on Today with the page theme color", () => {
    expect(value.start_url).toBe("/app");
    expect(value.scope).toBe("/");
    expect(value.theme_color).toBe("#f6f3e9");
    expect(value.background_color).toBe("#f6f3e9");
  });

  it("provides both regular and maskable icons", () => {
    const purposes = (value.icons ?? []).map((icon) => icon.purpose);
    expect(purposes).toContain("any");
    expect(purposes).toContain("maskable");
  });

  it("points shortcuts at member destinations", () => {
    expect((value.shortcuts ?? []).map((shortcut) => shortcut.url)).toEqual(["/app", "/app/library", "/app/progress"]);
  });
});

describe("file-level contracts", () => {
  it("does not ship internal design notes in the HTML (plan P10)", () => {
    const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
    expect(layout).not.toContain("<template");
    expect(layout).not.toContain("THESIS");
  });

  it.each([
    "src/app/app/not-found.tsx",
    "src/app/app/library/[slug]/page.tsx",
    "tests/fixtures/authenticated-app/app/app/not-found.tsx",
    "tests/fixtures/authenticated-app/app/app/library/[slug]/page.tsx",
    "src/domain/time-entry.ts",
    "src/domain/time-zones.ts",
  ])("%s exists", (file) => {
    expect(existsSync(join(root, file))).toBe(true);
  });

  it.each([
    "src/app/app/page.tsx",
    "src/app/app/settings/page.tsx",
    "src/app/app/progress/page.tsx",
    "src/app/app/prs/page.tsx",
    "src/app/app/history/page.tsx",
    "src/app/app/history/[sessionId]/page.tsx",
    "src/app/app/library/page.tsx",
    "src/app/app/library/[slug]/page.tsx",
    "src/app/app/library/custom/page.tsx",
    "src/app/app/library/custom/new/page.tsx",
    "src/app/app/library/custom/[id]/page.tsx",
    "src/app/app/program/edit/page.tsx",
    "src/app/app/program/[day]/page.tsx",
    "src/app/app/programs/page.tsx",
  ])("%s declares a page title (plan A5)", (file) => {
    const source = existsSync(join(root, file)) ? readFileSync(join(root, file), "utf8") : "";
    expect(source).toMatch(/export (const metadata|async function generateMetadata|function generateMetadata)/);
  });

  it("does not redirect Settings away before a routine exists (plan A2)", () => {
    for (const file of ["src/app/app/settings/page.tsx", "tests/fixtures/authenticated-app/app/app/settings/page.tsx"]) {
      expect(readFileSync(join(root, file), "utf8")).not.toMatch(/activeProgram\)\s*redirect/);
    }
  });
});
