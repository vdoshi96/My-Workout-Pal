import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ExerciseVideoField } from "@/components/video/exercise-video-field";
import { WorkoutRunner } from "@/components/workout/workout-runner";
import { generateCatalog } from "@/domain/exercises/catalog-generator";
import {
  buildCuratedVideoDatabaseRows,
  buildStarterDatabaseRows,
} from "@/domain/seed/starter-database-rows";
import {
  createInMemoryRunnerStorage,
  createWorkoutSnapshot,
} from "@/domain/workout-runner";
import { createCuratedVideoPair } from "@/domain/youtube/embed";
import { buildDefaultRequiredVideoVariations } from "@/domain/youtube/seed-validation";
import type { CuratedVideoSeed } from "@/domain/youtube/types";

const reviewedAt = "2026-08-26T20:00:00.000Z";

function video(
  canonicalExerciseSlug: string,
  videoId: string,
  displayOrder: 1 | 2,
): CuratedVideoSeed {
  return {
    canonicalExerciseSlug,
    variationId: "canonical",
    videoId,
    displayOrder,
    title: `${canonicalExerciseSlug} demonstration ${displayOrder}`,
    channelTitle: `Coach ${displayOrder}`,
    approvalState: "approved",
    reviewer: "Codex GPT-5.6 Sol",
    reviewedAt,
    fullWatchConfirmed: true,
  };
}

function completeRequiredSeed(): readonly CuratedVideoSeed[] {
  return buildDefaultRequiredVideoVariations().flatMap(
    ({ canonicalExerciseSlug }, exerciseIndex) => [
      video(
        canonicalExerciseSlug,
        `A${String(exerciseIndex * 2).padStart(10, "0")}`,
        1,
      ),
      video(
        canonicalExerciseSlug,
        `B${String(exerciseIndex * 2 + 1).padStart(10, "0")}`,
        2,
      ),
    ],
  );
}

describe("approved curated video publication", () => {
  it("wires the complete reviewed manifest into the default starter database graph", () => {
    const rows = buildStarterDatabaseRows();
    const videoIdsFor = (slug: string) => {
      const exerciseId = rows.catalogExercises.find((exercise) => exercise.slug === slug)?.id;
      return rows.curatedVideos
        .filter((video) => video.exerciseId === exerciseId)
        .map(({ youtubeVideoId }) => youtubeVideoId);
    };

    expect(rows.curatedVideos).toHaveLength(54);
    expect(videoIdsFor("barbell-back-squat")).toEqual(["ultWZbUMPL8", "1xMaFs0L3ao"]);
    expect(videoIdsFor("chest-supported-dumbbell-row")).toEqual(["vmX58YYK3-8", "mHBOUz9KY9A"]);
    expect(videoIdsFor("dumbbell-romanian-deadlift")).toEqual(["KrRtk8KbJik", "MprE4ppd27U"]);
  });

  it("maps the complete declared reviewed subset to deterministic database rows", () => {
    const rows = buildCuratedVideoDatabaseRows(completeRequiredSeed());

    expect(rows).toHaveLength(buildDefaultRequiredVideoVariations().length * 2);
    expect(rows[0]).toMatchObject({
      variationId: "canonical",
      approvalStatus: "approved",
      displayOrder: 1,
      watchedInFullAt: reviewedAt,
      approvedAt: reviewedAt,
      approvedBy: "Codex GPT-5.6 Sol",
      restrictionReason: null,
    });
    expect(rows.every(({ id }) => /^[0-9a-f-]{36}$/.test(id))).toBe(true);
  });

  it("renders either one validated interactive pair or a truthful unavailable state", () => {
    const pair = createCuratedVideoPair([
      video("dumbbell-bench-press", "AbCdEfGhI01", 1),
      video("dumbbell-bench-press", "ZyXwVuTsR98", 2),
    ]);
    const available = renderToStaticMarkup(<ExerciseVideoField videos={pair} />);
    const unavailable = renderToStaticMarkup(<ExerciseVideoField videos={undefined} />);

    expect(available).toContain("dumbbell-bench-press demonstration 1");
    expect(available).toContain("dumbbell-bench-press demonstration 2");
    expect(available).toContain("youtube-nocookie.com/embed/AbCdEfGhI01");
    expect(available).toContain(
      'allow="encrypted-media; gyroscope; picture-in-picture"',
    );
    expect(available).not.toContain("web-share");
    expect(available).not.toContain("Manual review pending");
    expect(unavailable).toContain("No demonstration is available");
    expect(unavailable).not.toContain("required YouTube API credential");
  });

  it("shows the matching catalog pair in the runner without blocking logging", () => {
    const snapshot = createWorkoutSnapshot({
      sessionId: "session-videos",
      ownerUid: "owner-videos",
      programRevisionId: "revision-videos",
      dayId: "push",
      dayName: "Push",
      exercises: [{
        id: "snapshot-press",
        name: "Dumbbell bench press",
        loggingKind: "weight_reps",
        sets: [{
          id: "press-work-1",
          position: 1,
          phase: "work",
          target: {
            kind: "weight_reps",
            minimumReps: 8,
            maximumReps: 12,
            restSeconds: 90,
          },
        }],
      }],
      cardioOptions: [],
    });
    const pair = createCuratedVideoPair([
      video("dumbbell-bench-press", "AbCdEfGhI01", 1),
      video("dumbbell-bench-press", "ZyXwVuTsR98", 2),
    ]);
    const markup = renderToStaticMarkup(
      <WorkoutRunner
        curatedVideosByExerciseId={{ "catalog-press": pair }}
        effectiveExerciseIdBySnapshot={{ "snapshot-press": "catalog-press" }}
        snapshot={snapshot}
        storage={createInMemoryRunnerStorage()}
        submitter={async () => ({ status: "saved", persistedId: "log" })}
      />,
    );

    expect(markup).toContain("Technique demonstrations");
    expect(markup).toContain("youtube-nocookie.com/embed/AbCdEfGhI01");
    expect(markup).toContain("Log set &amp; rest");
  });

  it("keeps synthetic text-only instructions visible without a public or private iframe", () => {
    const textOnly = generateCatalog([{
      slug: "synthetic-text-only-movement",
      name: "Synthetic text-only movement",
      role: "accessory",
      loggingKind: "bodyweight_reps",
      requiredEquipment: ["bodyweight"],
      movementFamily: "synthetic-text-only",
      primaryMuscles: ["core"],
      aliases: ["Text-only movement"],
      instructions: [
        "Set a stable starting position.",
        "Move under control.",
        "Stop before the position changes.",
      ],
    }])["synthetic-text-only-movement"]!;
    const publicMarkup = renderToStaticMarkup(
      <main>
        <ol>
          {textOnly.instructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ol>
        <ExerciseVideoField videos={undefined} />
      </main>,
    );
    const snapshot = createWorkoutSnapshot({
      sessionId: "session-text-only",
      ownerUid: "owner-text-only",
      programRevisionId: "revision-text-only",
      dayId: "day-text-only",
      dayName: "Text-only day",
      exercises: [{
        id: "snapshot-text-only",
        name: textOnly.name,
        loggingKind: textOnly.loggingKind,
        sets: [{
          id: "text-only-work-1",
          position: 1,
          phase: "work",
          target: {
            kind: "bodyweight_reps",
            minimumReps: 8,
            maximumReps: 12,
            restSeconds: 60,
          },
        }],
      }],
      cardioOptions: [],
    });
    const privateMarkup = renderToStaticMarkup(
      <WorkoutRunner
        curatedVideosByExerciseId={{}}
        effectiveExerciseIdBySnapshot={{
          "snapshot-text-only": "catalog-text-only",
        }}
        snapshot={snapshot}
        storage={createInMemoryRunnerStorage()}
        submitter={async () => ({ status: "saved", persistedId: "log" })}
      />,
    );

    expect(publicMarkup).toContain("Move under control.");
    expect(publicMarkup).toContain("No demonstration is available");
    expect(publicMarkup).not.toContain("<iframe");
    expect(privateMarkup).toContain("No demonstration is available");
    expect(privateMarkup).toContain("Log set &amp; rest");
    expect(privateMarkup).not.toContain("<iframe");
  });
});
