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
