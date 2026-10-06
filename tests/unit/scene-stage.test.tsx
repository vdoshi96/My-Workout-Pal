import { readFile } from "node:fs/promises";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PalSticker, SceneStage, type SceneName } from "@/components/ui/scene-stage";

// Scene art is decorative: it carries no meaning, pointer or focus semantics, disappears cleanly on
// image failure and in forced colours, and only moves when motion is welcome.
const scenes: Record<SceneName, string> = {
  pal: "pip-studio",
  library: "otter-study",
  routine: "beaver-plan",
  progress: "tortoise-review",
  settings: "hare-prepare",
  workout: "pip-recover",
};

describe("SceneStage", () => {
  it.each(Object.entries(scenes) as [SceneName, string][])("renders the %s scene as closed, decorative art with a dusk version", (scene, file) => {
    const markup = renderToStaticMarkup(<SceneStage scene={scene} />);
    expect(markup).toContain(`/illustrations/quiet-set/${file}.webp`);
    expect(markup).toContain(`/illustrations/quiet-set/${file}-dusk.webp 1200w`);
    expect(markup).toContain('media="(prefers-color-scheme: dark)"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('alt=""');
    expect(markup).toContain('draggable="false"');
    expect(markup).toContain('width="1200"');
    expect(markup).toContain('height="800"');
    expect(markup).not.toContain("tabindex");
    expect(markup).not.toContain('role="img"');
    expect(markup).not.toContain("/_next/image?url=");
  });

  it("renders pal stickers as decorative images too", () => {
    const markup = renderToStaticMarkup(<PalSticker pose="resting" />);
    expect(markup).toContain("/illustrations/quiet-set/pip-resting.webp");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('alt=""');
  });

  it("collapses on image failure, leaves forced colours alone, and moves only when motion is welcome", async () => {
    const [component, styles] = await Promise.all([
      readFile(new URL("../../src/components/ui/scene-stage.tsx", import.meta.url), "utf8"),
      readFile(new URL("../../src/app/studio-pals.css", import.meta.url), "utf8"),
    ]);
    expect(component).toContain("if (failed) return null;");
    expect(component).toContain("onError={() => setFailed(true)}");
    expect(styles).toMatch(/\.pal-scene\s*\{[^}]*pointer-events:\s*none;/u);
    expect(styles).toMatch(/@media \(forced-colors: active\)\s*\{\s*\.pal-scene, \.pal-sticker, \.pal-vignette\s*\{\s*display:\s*none;/u);
    expect(styles).toMatch(/@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\.pal-scene img\s*\{\s*animation:/u);
    expect(styles).toMatch(/\[data-reduced-motion=true\] :is\(\.pal-scene img, \.pal-sticker img, \.pal-sheet\[open\]\)\s*\{\s*animation:\s*none;/u);
  });
});
