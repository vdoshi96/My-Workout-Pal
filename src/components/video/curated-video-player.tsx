"use client";

import { useId, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent } from "react";

import {
  buildYouTubeEmbedUrl,
  buildYouTubeWatchUrl,
  type CuratedVideos,
} from "@/domain/youtube/embed";

import { VIDEO_VARIANT_NOTES } from "@/domain/youtube/variant-notes";

const subscribeToOrigin = () => () => {};

export function CuratedVideoPlayer({
  videos,
}: Readonly<{ videos: CuratedVideos }>) {
  const [activeVideoId, setActiveVideoId] = useState(videos[0].videoId);
  const playerId = useId();
  const origin = useSyncExternalStore<string | undefined>(subscribeToOrigin, () => window.location.origin, () => undefined);
  const [problemOpen, setProblemOpen] = useState(false);
  const activeVideo =
    videos.find(({ videoId }) => videoId === activeVideoId) ?? videos[0];

  function moveSelection(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const targetIndex =
      event.key === "ArrowRight"
        ? (index + 1) % videos.length
        : event.key === "ArrowLeft"
          ? (index - 1 + videos.length) % videos.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? videos.length - 1
              : undefined;
    if (targetIndex === undefined) return;
    event.preventDefault();
    const target = videos[targetIndex];
    if (!target) return;
    setActiveVideoId(target.videoId);
    document.getElementById(`${playerId}-${target.displayOrder}`)?.focus();
  }

  return (
    <div className="curated-player">
      <div
        aria-label="Choose a demonstration"
        aria-orientation="horizontal"
        className="curated-player-tabs"
        role="tablist"
      >
        {videos.map((video, index) => {
          const selected = video.videoId === activeVideo.videoId;
          return (
            <button
              aria-controls={playerId}
              aria-selected={selected}
              id={`${playerId}-${video.displayOrder}`}
              key={video.videoId}
              onClick={() => setActiveVideoId(video.videoId)}
              onKeyDown={(event) => moveSelection(event, index)}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              <span>{index === 0 ? "Watch demo" : "Another demo"}</span>
              <strong>{video.title}</strong>
              <small>{video.channelTitle}</small>
            </button>
          );
        })}
      </div>

      <section
        aria-labelledby={`${playerId}-${activeVideo.displayOrder}`}
        className="curated-player-panel"
        id={playerId}
        role="tabpanel"
      >
        <div className="curated-player-frame">
          <iframe
            allow="encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            src={buildYouTubeEmbedUrl(activeVideo.videoId, origin)}
            title={`${activeVideo.title} — ${activeVideo.channelTitle}`}
          />
        </div>
        <div className="curated-player-caption">
          <p>
            <strong>{activeVideo.title}</strong>
            <span>Demonstrated by {activeVideo.channelTitle}</span>
          </p>
          <a
            href={buildYouTubeWatchUrl(activeVideo.videoId)}
            rel="noopener"
            target="_blank"
          >
            Open on YouTube
          </a>
        </div>
        {VIDEO_VARIANT_NOTES[activeVideo.videoId] ? <p className="video-variant-note">{VIDEO_VARIANT_NOTES[activeVideo.videoId]}</p> : null}
        <button type="button" className="quiet-text-button" onClick={() => setProblemOpen(!problemOpen)} aria-expanded={problemOpen}>Report a problem</button>
        {problemOpen ? <div className="video-problem-help"><p>If playback fails, try the other demonstration or open YouTube. Written instructions remain available.</p><a href={`https://github.com/vdoshi96/My-Workout-Pal/issues/new?title=${encodeURIComponent(`Video problem: ${activeVideo.canonicalExerciseSlug}`)}&body=${encodeURIComponent(`Video ID: ${activeVideo.videoId}\nMovement: ${activeVideo.canonicalExerciseSlug}\nProblem (omit account or workout details): `)}`} target="_blank" rel="noopener noreferrer">Open a public problem report</a><p>Opens GitHub. Review the report before submitting; do not include private workout information.</p></div> : null}
      </section>
    </div>
  );
}
