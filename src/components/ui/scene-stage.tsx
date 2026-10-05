"use client";

import { useState } from "react";

import { useCompanionChoice } from "./companion-preference";

const ART = "/illustrations/quiet-set";

/**
 * Full-bleed decorative studio behind a page's opening section.
 * The selected pal stands in the room; "Off" keeps the empty studio (evening version in dark mode).
 * Copy contrast never depends on this picture: the stage's scrim guarantees it.
 */
export function SceneStage({ priority = false }: Readonly<{ priority?: boolean }>) {
  const choice = useCompanionChoice();
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const pal = choice === "off" ? null : `${ART}/${choice}-studio`;
  return (
    <div aria-hidden="true" className={`pal-scene${pal ? "" : " pal-scene--evening-ready"}`} data-scene={pal ? choice : "studio"}>
      <picture>
        {pal ? null : <source media="(prefers-color-scheme: dark)" srcSet={`${ART}/evening-studio-phone.webp 600w, ${ART}/evening-studio.webp 1200w`} sizes="100vw" />}
        <img
          alt=""
          decoding="async"
          draggable={false}
          fetchPriority={priority ? "high" : "auto"}
          height={800}
          onError={() => setFailed(true)}
          sizes="100vw"
          src={`${pal ?? `${ART}/dawn-studio`}.webp`}
          srcSet={`${pal ?? `${ART}/dawn-studio`}-phone.webp 600w, ${pal ?? `${ART}/dawn-studio`}.webp 1200w`}
          width={1200}
        />
      </picture>
    </div>
  );
}

/** A round "sticker" of a pal pose. Pose sheets are opaque cream, so they are always shown on a cream disc. */
export function PalSticker({ pose }: Readonly<{ pose: "ready" | "resting" | "complete" }>) {
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
