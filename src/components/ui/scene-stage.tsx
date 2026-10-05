"use client";

import { useState } from "react";

import { useCompanionChoice } from "./companion-preference";

const ART = "/illustrations/quiet-set";

/** Which studio a page opens on. "pal" shows the member's chosen pal (Pip or Mica); the others are fixed characters. */
export type SceneName = "pal" | "library" | "routine" | "progress" | "settings" | "workout";

const FIXED_SCENES: Readonly<Record<Exclude<SceneName, "pal">, string>> = {
  library: "otter-study",
  routine: "beaver-plan",
  progress: "tortoise-review",
  settings: "hare-prepare",
  workout: "pip-recover",
};

/** Resolves the art for a scene. With characters turned off, every page keeps the empty studio. */
function sceneSources(scene: SceneName, choice: "pip" | "mica" | "off") {
  if (choice === "off") return { day: `${ART}/dawn-studio`, dusk: `${ART}/evening-studio` };
  const base = scene === "pal" ? `${choice}-studio` : FIXED_SCENES[scene];
  return { day: `${ART}/${base}`, dusk: `${ART}/${base}-dusk` };
}

/** A daytime picture with its dusk version for dark mode. Decorative only. */
export function SceneArt({ base, dusk, priority = false, sizes = "100vw", onError }: Readonly<{
  base: string;
  dusk: string;
  priority?: boolean;
  sizes?: string;
  onError?: () => void;
}>) {
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" sizes={sizes} srcSet={`${dusk}-phone.webp 600w, ${dusk}.webp 1200w`} />
      <img
        alt=""
        decoding="async"
        draggable={false}
        fetchPriority={priority ? "high" : "auto"}
        height={800}
        loading={priority ? "eager" : "lazy"}
        onError={onError}
        sizes={sizes}
        src={`${base}.webp`}
        srcSet={`${base}-phone.webp 600w, ${base}.webp 1200w`}
        width={1200}
      />
    </picture>
  );
}

/**
 * Full-bleed decorative studio behind a page's opening section. Copy contrast never depends on this
 * picture: light mode lays a scrim over the wall, and dark mode masks the room into the night canvas.
 */
export function SceneStage({ priority = false, scene = "pal" }: Readonly<{ priority?: boolean; scene?: SceneName }>) {
  const choice = useCompanionChoice();
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const sources = sceneSources(scene, choice);
  return (
    <div aria-hidden="true" className="pal-scene" data-scene={choice === "off" ? "studio" : scene === "pal" ? choice : scene}>
      <SceneArt base={sources.day} dusk={sources.dusk} onError={() => setFailed(true)} priority={priority} />
    </div>
  );
}

export type PalPose = "ready" | "resting" | "complete";

/** A round "sticker" of a pal pose. Pose sheets are opaque cream, so they always sit on a cream disc. */
export function PalSticker({ pose }: Readonly<{ pose: PalPose }>) {
  const choice = useCompanionChoice();
  const [failed, setFailed] = useState(false);
  if (choice === "off" || failed) return null;
  return (
    <div aria-hidden="true" className="pal-sticker" data-pose={pose}>
      {/* eslint-disable-next-line @next/next/no-img-element -- explicit public asset keeps the nonce CSP and offline cache policy. */}
      <img alt="" decoding="async" draggable={false} height={320} loading="lazy" onError={() => setFailed(true)} src={`${ART}/${choice}-${pose}.webp`} width={320} />
    </div>
  );
}
