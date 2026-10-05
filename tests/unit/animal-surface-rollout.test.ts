import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("Wave 3 companion route and cache boundaries", () => {
  it("places only the closed variants on the named rollout surfaces", async () => {
    const sources = await Promise.all(
      [
        "../../src/app/library/page.tsx",
        "../../src/app/app/library/page.tsx",
        "../../src/components/program/program-editor.tsx",
        "../../src/app/app/history/page.tsx",
        "../../src/components/insights/training-history-detail.tsx",
        "../../src/components/settings/settings-form.tsx",
        "../../src/app/workout/[sessionId]/page.tsx",
      ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
    );

    expect(sources[0]).toContain('<SceneStage scene="library" />');
    expect(sources[1]).toContain('<SceneStage scene="library" />');
    expect(sources[2]).toContain('<SceneStage scene="routine" />');
    expect(sources[3]).toContain('<SceneStage scene="progress" />');
    expect(sources[4]).toContain('<SceneStage scene="progress" />');
    expect(sources[5]).toContain('<SceneStage scene="settings" />');
    // The runner opens on the workout studio scene instead of a corner companion.
    expect(sources[6]).toContain('<SceneStage scene="workout" />');
    expect(sources[6]).not.toContain("DecorativeCompanion");
  });

  it("allows only the genuinely public Library variant into the public cache", async () => {
    const policy = await readFile(
      new URL("../../src/domain/pwa/cache-policy.ts", import.meta.url),
      "utf8",
    );

    expect(policy).toContain('"/illustrations/companions/cataloging-otter.webp"');
    expect(policy).toContain('"/illustrations/companions/cataloging-otter-512.webp"');
    expect(policy).not.toContain("routine-drafting-beaver");
    expect(policy).not.toContain("history-archive-tortoise");
    expect(policy).not.toContain("settings-packing-hare");
    expect(policy).not.toContain("workout-corner-bear");
  });

  it("keeps fetchable public assets free of provenance sidecars and verifies private-safe records", async () => {
    const publicIllustrationsDirectory = new URL(
      "../../public/illustrations/",
      import.meta.url,
    );
    const publicDirectory = new URL(
      "../../public/illustrations/companions/",
      import.meta.url,
    );
    const provenanceDirectory = new URL(
      "../../docs/design/provenance/companions/",
      import.meta.url,
    );
    const publicEntries = await readdir(publicDirectory);
    const provenanceEntries = await readdir(provenanceDirectory);
    const publicWebps = publicEntries.filter((name) => name.endsWith(".webp"));

    expect(
      (await readdir(publicIllustrationsDirectory, { recursive: true })).filter(
        (name) => name.endsWith(".json"),
      ),
    ).toEqual([]);
    expect(publicEntries.filter((name) => name.endsWith(".json"))).toEqual([]);
    expect(provenanceEntries.sort()).toEqual(
      publicWebps.map((name) => `${name}.json`).sort(),
    );

    for (const webpName of publicWebps) {
      const [asset, provenanceText] = await Promise.all([
        readFile(new URL(webpName, publicDirectory)),
        readFile(new URL(`${webpName}.json`, provenanceDirectory), "utf8"),
      ]);
      const provenance = JSON.parse(provenanceText) as Record<string, unknown>;
      expect(provenance).toMatchObject({
        generator: "OpenAI built-in image generation",
        provenanceVersion: 2,
        sha256: createHash("sha256").update(asset).digest("hex"),
      });
      expect(String(provenance["prompt"] ?? "").length).toBeGreaterThan(100);
      expect(provenance).not.toHaveProperty("source");
      expect(provenance).not.toHaveProperty("derivedFrom");
      expect(provenance).not.toHaveProperty("chromaSource");
      expect(provenance).not.toHaveProperty("alphaSource");
      expect(provenanceText).not.toMatch(
        /\/Users\/|\/private\/|generated_images|generationId|exec-[0-9a-z-]+/u,
      );
    }

    for (const webpName of ["workout-pals-gym.webp", "workout-pals-gym-768.webp"]) {
      const [asset, provenanceText] = await Promise.all([
        readFile(new URL(`../../public/illustrations/${webpName}`, import.meta.url)),
        readFile(
          new URL(
            `../../docs/design/provenance/illustrations/${webpName}.json`,
            import.meta.url,
          ),
          "utf8",
        ),
      ]);
      const provenance = JSON.parse(provenanceText) as Record<string, unknown>;
      expect(provenance).toMatchObject({
        generator: "OpenAI built-in image generation",
        provenanceVersion: 2,
        sha256: createHash("sha256").update(asset).digest("hex"),
      });
      expect(String(provenance["prompt"] ?? "").length).toBeGreaterThan(100);
      expect(provenance).not.toHaveProperty("source");
      expect(provenanceText).not.toMatch(
        /\/Users\/|\/private\/|generated_images|generationId|exec-[0-9a-z-]+/u,
      );
    }
  });
});
