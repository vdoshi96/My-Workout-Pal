"use client";

import { useState } from "react";
import { useCompanionChoice } from "./companion-preference";

function companionAsset(pose: "ready" | "resting" | "complete") {
  return Object.freeze({ fetchPriority: "auto" as const, height: 320, loading: "lazy" as const,
    sizes: "(max-width: 900px) 160px, 240px", src: `/illustrations/quiet-set/pip-${pose}.webp`, width: 320 });
}
export const COMPANION_ASSETS = Object.freeze({
  landing: companionAsset("ready"),
  "member-home": companionAsset("ready"),
  "progress-preview": companionAsset("complete"),
  library: companionAsset("ready"),
  "routine-editor": companionAsset("ready"),
  history: companionAsset("complete"),
  settings: companionAsset("ready"),
  workout: companionAsset("resting"),
});

export type DecorativeCompanionVariant = keyof typeof COMPANION_ASSETS;

export function DecorativeCompanion({
  variant,
}: Readonly<{ variant: DecorativeCompanionVariant }>) {
  const [visible, setVisible] = useState(true);
  const choice = useCompanionChoice();
  const pose = variant === "workout" ? "resting" : variant === "history" || variant === "progress-preview" ? "complete" : "ready";
  const asset = { ...COMPANION_ASSETS[variant], src: `/illustrations/quiet-set/${`${choice}-${pose}`}.webp`, srcSet: undefined, width: 320, height: 320 };
  if (choice === "off") return null;

  return (
    <div
      aria-hidden="true"
      className={`decorative-companion decorative-companion--${variant}`}
      data-companion-placement={variant}
      hidden={!visible}
    >
      {/* The explicit public source is intentionally compatible with the
          nonce CSP and the public service-worker allowlist. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        aria-hidden="true"
        decoding="async"
        draggable={false}
        fetchPriority={asset.fetchPriority}
        height={asset.height}
        loading={asset.loading}
        onError={() => setVisible(false)}
        sizes={asset.sizes}
        src={asset.src}
        srcSet={asset.srcSet}
        width={asset.width}
      />
    </div>
  );
}
