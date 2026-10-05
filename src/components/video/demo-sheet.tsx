"use client";

import { useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import type { CuratedVideos } from "@/domain/youtube/embed";

import { CuratedVideoPlayer } from "./curated-video-player";

/**
 * Opens an approved demo pair in place, so the person never loses their spot.
 * The player mounts only while the sheet is open; closing unmounts the frame and
 * the native dialog returns focus to the trigger.
 */
export function DemoSheet({ movementName, videos }: Readonly<{ movementName: string; videos: CuratedVideos }>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-haspopup="dialog"
        className="pal-demo-button"
        onClick={() => { setOpen(true); dialog.current?.showModal(); }}
        type="button"
      >
        <span className="pal-play" aria-hidden="true"><Icon name="play" /></span>
        Watch demo<span className="sr-only"> for {movementName}</span>
      </button>
      <dialog
        aria-labelledby={`${videos[0].videoId}-demo-title`}
        className="pal-sheet"
        onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
        onClose={() => setOpen(false)}
        ref={dialog}
      >
        <header>
          <h2 id={`${videos[0].videoId}-demo-title`}>{movementName}</h2>
          <button onClick={() => dialog.current?.close()} type="button">Close</button>
        </header>
        {open ? <CuratedVideoPlayer videos={videos} /> : null}
      </dialog>
    </>
  );
}
