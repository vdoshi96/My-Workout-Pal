import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  canShowRoutineEditorCompanion,
  canShowSettingsCompanion,
  canShowWorkoutCompanion,
} from "@/domain/companions/visibility";

describe("Wave 3 companion visibility", () => {
  it("keeps routine-editor art out of mutation, validation, status, and review states", () => {
    const neutral = {
      busy: false,
      canMutate: true,
      dirty: false,
      hasErrors: false,
      hasOpenReview: false,
      hasStatusMessage: false,
    };

    expect(canShowRoutineEditorCompanion(neutral)).toBe(true);
    for (const critical of Object.keys(neutral) as (keyof typeof neutral)[]) {
      const criticalValue = critical === "canMutate" ? false : true;
      expect(
        canShowRoutineEditorCompanion({ ...neutral, [critical]: criticalValue }),
      ).toBe(false);
    }
  });

  it("keeps Settings art out of identity, save, error, and deletion states", () => {
    const neutral = {
      busy: false,
      deleteBusy: false,
      hasDeletionReview: false,
      hasStatusMessage: false,
      hasUnsubmittedInput: false,
      identityReady: true,
      verified: true,
    };

    expect(canShowSettingsCompanion(neutral)).toBe(true);
    expect(canShowSettingsCompanion({ ...neutral, busy: true })).toBe(false);
    expect(canShowSettingsCompanion({ ...neutral, deleteBusy: true })).toBe(false);
    expect(canShowSettingsCompanion({ ...neutral, hasDeletionReview: true })).toBe(false);
    expect(canShowSettingsCompanion({ ...neutral, hasStatusMessage: true })).toBe(false);
    expect(canShowSettingsCompanion({ ...neutral, hasUnsubmittedInput: true })).toBe(false);
    expect(canShowSettingsCompanion({ ...neutral, identityReady: false })).toBe(false);
    expect(canShowSettingsCompanion({ ...neutral, verified: false })).toBe(false);
  });

  it("shows runner art only in a recovered, online, neutral overview", () => {
    const neutral = {
      hasActiveLogging: false,
      hasBlockingNotice: false,
      hasGuidance: false,
      hasPendingOperation: false,
      online: true,
      recoveryReady: true,
      terminal: false,
      timerActive: false,
    };

    expect(canShowWorkoutCompanion(neutral)).toBe(true);
    for (const critical of Object.keys(neutral) as (keyof typeof neutral)[]) {
      const criticalValue = critical === "online" || critical === "recoveryReady"
        ? false
        : true;
      expect(
        canShowWorkoutCompanion({ ...neutral, [critical]: criticalValue }),
      ).toBe(false);
    }
  });
});

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
        "../../src/components/workout/workout-runner.tsx",
      ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
    );

    expect(sources[0]).toContain('<DecorativeCompanion variant="library" />');
    expect(sources[1]).toContain('<DecorativeCompanion variant="library" />');
    expect(sources[2]).toContain('<DecorativeCompanion variant="routine-editor" />');
    expect(sources[3]).toContain('<DecorativeCompanion variant="history" />');
    expect(sources[4]).toContain('<DecorativeCompanion variant="history" />');
    expect(sources[5]).toContain('<DecorativeCompanion variant="settings" />');
    expect(sources[6]).toContain('<DecorativeCompanion variant="workout" />');
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
