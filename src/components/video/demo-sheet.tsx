"use client";

import { useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import type { CuratedVideos } from "@/domain/youtube/embed";

import { CuratedVideoPlayer } from "./curated-video-player";

/**
 * Opens an approved demo pair in place, so the person never loses their spot.
 * The player mounts only while the sheet is open; closing (Close, Escape or a tap
 * outside) unmounts the frame and returns focus to the trigger.
 */
export function DemoSheet({ movementName, videos }: Readonly<{ movementName: string; videos: CuratedVideos }>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = `${useId()}-demo-title`;
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-haspopup="dialog"
        className="pal-demo-button"
        onClick={() => { setOpen(true); dialog.current?.showModal(); }}
        ref={trigger}
        type="button"
      >
        <span className="pal-play" aria-hidden="true"><Icon name="play" /></span>
        Watch demo<span className="sr-only"> for {movementName}</span>
      </button>
      <dialog
        aria-labelledby={titleId}
        className="pal-sheet"
        onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
        onClose={() => {
          setOpen(false);
          // Native dialogs restore focus in current browsers; this covers older ones.
          if (trigger.current && document.activeElement !== trigger.current) trigger.current.focus();
        }}
        ref={dialog}
      >
        <header>
          <h2 id={titleId}>{movementName}</h2>
          <button onClick={() => dialog.current?.close()} type="button">Close</button>
        </header>
        {open ? <CuratedVideoPlayer videos={videos} /> : null}
      </dialog>
    </>
  );
}

/** A demo trigger when an approved pair exists, otherwise a quiet "No demo yet". */
export function MovementDemo({
  movementName,
  videos,
}: Readonly<{ movementName: string; videos: CuratedVideos | undefined }>) {
  return videos
    ? <DemoSheet movementName={movementName} videos={videos} />
    : <span className="pal-no-demo">No demo yet</span>;
}
