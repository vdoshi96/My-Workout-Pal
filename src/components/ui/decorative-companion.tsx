"use client";

import { useState } from "react";
import { useCompanionChoice } from "./companion-preference";

function companionAsset(scene: string) {
  return Object.freeze({ fetchPriority: "auto" as const, height: 800, loading: "lazy" as const,
    sizes: "(max-width: 700px) 600px, 1200px", src: `/illustrations/quiet-set/${scene}.webp`, width: 1200 });
}
export const COMPANION_ASSETS = Object.freeze({
  landing: companionAsset("pip-studio"),
  "member-home": companionAsset("pip-studio"),
  "progress-preview": companionAsset("tortoise-review"),
  library: companionAsset("otter-study"),
  "routine-editor": companionAsset("beaver-plan"),
  history: companionAsset("tortoise-review"),
  settings: companionAsset("hare-prepare"),
  workout: companionAsset("pip-recover"),
});

export type DecorativeCompanionVariant = keyof typeof COMPANION_ASSETS;

export function DecorativeCompanion({
  variant,
}: Readonly<{ variant: DecorativeCompanionVariant }>) {
  const [visible, setVisible] = useState(true);
  const choice = useCompanionChoice();
  const source = variant === "member-home" || variant === "landing"
    ? `/illustrations/quiet-set/${choice}-studio.webp`
    : COMPANION_ASSETS[variant].src;
  const asset = { ...COMPANION_ASSETS[variant], src: source, srcSet: `${source.replace(".webp", "-phone.webp")} 600w, ${source} 1200w` };
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
