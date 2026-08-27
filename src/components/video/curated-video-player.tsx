"use client";

import { useId, useState } from "react";
import type { KeyboardEvent } from "react";

import {
  buildYouTubeEmbedUrl,
  buildYouTubeWatchUrl,
  type CuratedVideoPair,
} from "@/domain/youtube/embed";

export function CuratedVideoPlayer({
  videos,
}: Readonly<{ videos: CuratedVideoPair }>) {
  const [activeVideoId, setActiveVideoId] = useState(videos[0].videoId);
  const playerId = useId();
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
        aria-label="Choose a curated demonstration"
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
              <span>Demo {video.displayOrder}</span>
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
            src={buildYouTubeEmbedUrl(activeVideo.videoId)}
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
            Open this demo on YouTube
          </a>
        </div>
      </section>
    </div>
  );
}
