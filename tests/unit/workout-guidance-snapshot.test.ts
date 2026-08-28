import { describe, expect, it } from "vitest";

import {
  createWorkoutSnapshot,
  type RunnerSnapshotInput,
} from "@/domain/workout-runner";

function snapshotInput(): RunnerSnapshotInput {
  return {
    sessionId: "session-guidance",
    ownerUid: "owner-guidance",
    programRevisionId: "revision-guidance",
    dayId: "day-guidance",
    dayName: "Guided day",
    exercises: [
      {
        id: "exercise-guidance",
        name: "Private carry",
        loggingKind: "duration",
        guidance: [
          {
            kind: "youtube",
            canonicalUrl: "https://www.youtube.com/watch?v=AbCdEfGhI01",
            videoId: "AbCdEfGhI01",
            embedUrl: "https://www.youtube-nocookie.com/embed/AbCdEfGhI01",
          },
          {
            kind: "external",
            canonicalUrl: "https://example.com/carry-guide",
          },
        ],
        sets: [
          {
            id: "set-guidance",
            position: 1,
            phase: "work",
            target: {
              kind: "duration",
              minimumSeconds: 30,
              maximumSeconds: 60,
              restSeconds: 45,
            },
          },
        ],
      },
    ],
  };
}

describe("workout guidance snapshots", () => {
  it("copies and deeply freezes presentation-safe guidance", () => {
    const input = snapshotInput();
    const snapshot = createWorkoutSnapshot(input);

    expect(snapshot.exercises[0]?.guidance).toEqual(
      input.exercises[0]?.guidance,
    );
    expect(snapshot.exercises[0]?.guidance).not.toBe(
      input.exercises[0]?.guidance,
    );
    expect(Object.isFrozen(snapshot.exercises[0]?.guidance)).toBe(true);
    expect(Object.isFrozen(snapshot.exercises[0]?.guidance?.[0])).toBe(true);
  });

  it("rejects malformed, rewritten, or over-limit guidance on hydration", () => {
    const input = snapshotInput();
    const exercise = input.exercises[0]!;

    expect(() =>
      createWorkoutSnapshot({
        ...input,
        exercises: [
          {
            ...exercise,
            guidance: [
              ...exercise.guidance!,
              {
                kind: "external",
                canonicalUrl: "https://example.com/third",
              },
            ],
          },
        ],
      }),
    ).toThrow(/at most 2/i);

    expect(() =>
      createWorkoutSnapshot({
        ...input,
        exercises: [
          {
            ...exercise,
            guidance: [
              {
                kind: "youtube",
                canonicalUrl: "https://www.youtube.com/watch?v=AbCdEfGhI01",
                videoId: "AbCdEfGhI01",
                embedUrl: "https://attacker.example/embed/AbCdEfGhI01",
              },
            ],
          },
        ],
      }),
    ).toThrow(/guidance/i);
  });
});
