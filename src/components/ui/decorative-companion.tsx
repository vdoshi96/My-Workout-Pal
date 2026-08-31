"use client";

import { useState } from "react";

export const COMPANION_ASSETS = Object.freeze({
  landing: {
    fetchPriority: "high",
    height: 1024,
    loading: "eager",
    sizes: "(max-width: 63.99rem) min(76vw, 24rem), min(34vw, 30rem)",
    src: "/illustrations/companions/planning-hedgehog.webp",
    srcSet:
      "/illustrations/companions/planning-hedgehog-512.webp 512w, /illustrations/companions/planning-hedgehog.webp 1024w",
    width: 1024,
  },
  "member-home": {
    fetchPriority: "auto",
    height: 1024,
    loading: "lazy",
    sizes: "(max-width: 59.99rem) min(76vw, 22rem), min(24vw, 22rem)",
    src: "/illustrations/companions/preparing-fox.webp",
    srcSet:
      "/illustrations/companions/preparing-fox-512.webp 512w, /illustrations/companions/preparing-fox.webp 1024w",
    width: 1024,
  },
  "progress-preview": {
    fetchPriority: "auto",
    height: 1024,
    loading: "lazy",
    sizes: "(max-width: 47.99rem) min(76vw, 21rem), min(24vw, 21rem)",
    src: "/illustrations/companions/reviewing-raccoon.webp",
    srcSet:
      "/illustrations/companions/reviewing-raccoon-512.webp 512w, /illustrations/companions/reviewing-raccoon.webp 1024w",
    width: 1024,
  },
  library: {
    fetchPriority: "auto",
    height: 1024,
    loading: "lazy",
    sizes: "(max-width: 63.99rem) 1px, min(16vw, 18rem)",
    src: "/illustrations/companions/cataloging-otter.webp",
    srcSet:
      "/illustrations/companions/cataloging-otter-512.webp 512w, /illustrations/companions/cataloging-otter.webp 1024w",
    width: 1024,
  },
  "routine-editor": {
    fetchPriority: "auto",
    height: 1024,
    loading: "lazy",
    sizes: "(max-width: 63.99rem) 1px, min(15vw, 17rem)",
    src: "/illustrations/companions/routine-drafting-beaver.webp",
    srcSet:
      "/illustrations/companions/routine-drafting-beaver-512.webp 512w, /illustrations/companions/routine-drafting-beaver.webp 1024w",
    width: 1024,
  },
  history: {
    fetchPriority: "auto",
    height: 1024,
    loading: "lazy",
    sizes: "(max-width: 63.99rem) 1px, min(14vw, 16rem)",
    src: "/illustrations/companions/history-archive-tortoise.webp",
    srcSet:
      "/illustrations/companions/history-archive-tortoise-512.webp 512w, /illustrations/companions/history-archive-tortoise.webp 1024w",
    width: 1024,
  },
  settings: {
    fetchPriority: "auto",
    height: 1024,
    loading: "lazy",
    sizes: "(max-width: 47.99rem) 1px, min(14vw, 16rem)",
    src: "/illustrations/companions/settings-packing-hare.webp",
    srcSet:
      "/illustrations/companions/settings-packing-hare-512.webp 512w, /illustrations/companions/settings-packing-hare.webp 1024w",
    width: 1024,
  },
  workout: {
    fetchPriority: "auto",
    height: 1024,
    loading: "lazy",
    sizes: "(max-width: 63.99rem) 1px, min(13vw, 15rem)",
    src: "/illustrations/companions/workout-corner-bear.webp",
    srcSet:
      "/illustrations/companions/workout-corner-bear-512.webp 512w, /illustrations/companions/workout-corner-bear.webp 1024w",
    width: 1024,
  },
} as const);

export type DecorativeCompanionVariant = keyof typeof COMPANION_ASSETS;

export function DecorativeCompanion({
  variant,
}: Readonly<{ variant: DecorativeCompanionVariant }>) {
  const [visible, setVisible] = useState(true);
  const asset = COMPANION_ASSETS[variant];

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
