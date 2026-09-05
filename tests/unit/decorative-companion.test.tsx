import { readFile } from "node:fs/promises";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  COMPANION_ASSETS,
  DecorativeCompanion,
} from "@/components/ui/decorative-companion";

describe("DecorativeCompanion", () => {
  it("keeps a closed, text-free production asset contract", () => {
    expect(Object.keys(COMPANION_ASSETS)).toEqual([
      "landing",
      "member-home",
      "progress-preview",
      "library",
      "routine-editor",
      "history",
      "settings",
      "workout",
    ]);
    for (const asset of Object.values(COMPANION_ASSETS)) {
      expect(asset.src).toMatch(/^\/illustrations\/quiet-set\/(pip-studio|tortoise-review|otter-study|beaver-plan|hare-prepare|pip-recover)\.webp$/);
      expect(asset.width).toBe(1200);
      expect(asset.height).toBe(800);
    }
  });

  it.each(Object.keys(COMPANION_ASSETS) as (keyof typeof COMPANION_ASSETS)[])(
    "renders %s outside meaning, pointer, and focus semantics",
    (variant) => {
      const markup = renderToStaticMarkup(<DecorativeCompanion variant={variant} />);

      expect(markup).toContain(`data-companion-placement="${variant}"`);
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toContain('alt=""');
      expect(markup).toContain('draggable="false"');
      expect(markup).not.toContain("tabindex");
      expect(markup).not.toContain('role="img"');
    },
  );

  it("collapses the full slot on image failure and in forced colors", async () => {
    const [component, styles] = await Promise.all([
      readFile(
        new URL("../../src/components/ui/decorative-companion.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../../src/app/globals.css", import.meta.url), "utf8"),
    ]);

    expect(component).toContain("hidden={!visible}");
    expect(component).toContain("onError={() => setVisible(false)}");
    expect(styles).toMatch(/\.decorative-companion\s*\{[^}]*pointer-events:\s*none;/u);
    expect(styles).toMatch(
      /@media \(forced-colors: active\)[\s\S]*?\.decorative-companion\s*\{[^}]*display:\s*none;/u,
    );
    expect(styles).toMatch(
      /@media \(forced-colors: active\)[\s\S]*?\.landing-hero, \.member-program-hero, \.sample-hero\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/u,
    );
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.decorative-companion img\s*\{[^}]*animation:\s*none/u,
    );
    expect(styles).toMatch(
      /\.landing-hero:has\(\.decorative-companion\[hidden\]\), \.member-program-hero:has\(\.decorative-companion\[hidden\]\), \.sample-hero:has\(\.decorative-companion\[hidden\]\)\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/u,
    );
    expect(styles).toMatch(
      /\.companion-heading:has\(\.decorative-companion\[hidden\]\)\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/u,
    );
    expect(styles).toMatch(
      /\.decorative-companion\s*\{[^}]*grid-template-rows:\s*minmax\(0, 1fr\);/u,
    );
    expect(styles).toMatch(
      /\.decorative-companion img\s*\{[^}]*block-size:\s*100%;[^}]*inline-size:\s*100%;[^}]*object-fit:\s*contain;/u,
    );
    expect(styles).toMatch(
      /@media \(max-width: 63\.99rem\)[\s\S]*?\.decorative-companion img\s*\{[^}]*aspect-ratio:\s*auto;[^}]*max-block-size:\s*100%;/u,
    );
    expect(styles).toMatch(
      /\.decorative-companion--progress-preview img\s*\{[^}]*aspect-ratio:\s*1;[^}]*border:\s*1px solid var\(--companion-paper-edge\);[^}]*object-fit:\s*cover;/u,
    );
    expect(styles).toMatch(
      /@media \(max-width: 47\.99rem\)[\s\S]*?\.member-program--resumable \.decorative-companion--member-home\s*\{[^}]*display:\s*none;/u,
    );
    expect(styles).toMatch(
      /@media \(max-width: 63\.99rem\)[\s\S]*?\.decorative-companion--routine-editor,[\s\S]*?\.decorative-companion--workout\s*\{[^}]*display:\s*none;/u,
    );
  });
});
