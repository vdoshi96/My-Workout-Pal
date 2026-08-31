import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

// @ts-expect-error The maintained Node runner helper intentionally has no TS declaration.
import { stageAuthenticatedFixture } from "../../scripts/lib/authenticated-fixture-staging.mjs";

const temporaryRoots: string[] = [];

function fixturePaths() {
  const repositoryRoot = mkdtempSync(resolve(tmpdir(), "mwp-fixture-stage-"));
  temporaryRoots.push(repositoryRoot);
  const sourceDirectory = resolve(repositoryRoot, "source");
  const fixtureDirectory = resolve(repositoryRoot, "fixture");
  mkdirSync(sourceDirectory, { recursive: true });
  const contourSource = resolve(sourceDirectory, "contours.svg");
  const companionSource = resolve(sourceDirectory, "companion.webp");
  writeFileSync(contourSource, "contours");
  writeFileSync(companionSource, "companion");
  return {
    companionDestination: resolve(fixtureDirectory, "companion.webp"),
    companionSource,
    contourDestination: resolve(fixtureDirectory, "contours.svg"),
    contourSource,
    repositoryRoot,
  };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe("authenticated fixture staging", () => {
  it("serializes shared destinations and removes only files created by its lock owner", () => {
    const paths = fixturePaths();
    const input = {
      contourDestination: paths.contourDestination,
      contourSource: paths.contourSource,
      fixtureAssets: [
        {
          destination: paths.companionDestination,
          source: paths.companionSource,
        },
      ],
      repositoryRoot: paths.repositoryRoot,
    };

    const release = stageAuthenticatedFixture(input);
    expect(existsSync(paths.contourDestination)).toBe(true);
    expect(existsSync(paths.companionDestination)).toBe(true);
    expect(() => stageAuthenticatedFixture(input)).toThrow(
      "Another authenticated browser harness is already active for this worktree.",
    );

    release();
    expect(existsSync(paths.contourDestination)).toBe(false);
    expect(existsSync(paths.companionDestination)).toBe(false);
  });

  it("cleans a partial stage without deleting a pre-existing destination", () => {
    const paths = fixturePaths();
    mkdirSync(resolve(paths.companionDestination, ".."), { recursive: true });
    writeFileSync(paths.companionDestination, "owned-by-other");
    expect(() =>
      stageAuthenticatedFixture({
        contourDestination: paths.contourDestination,
        contourSource: paths.contourSource,
        fixtureAssets: [
          {
            destination: paths.companionDestination,
            source: paths.companionSource,
          },
        ],
        repositoryRoot: paths.repositoryRoot,
      }),
    ).toThrow();
    expect(existsSync(paths.contourDestination)).toBe(false);
    expect(readFileSync(paths.companionDestination, "utf8")).toBe(
      "owned-by-other",
    );
    unlinkSync(paths.companionDestination);

    const release = stageAuthenticatedFixture({
      contourDestination: paths.contourDestination,
      contourSource: paths.contourSource,
      fixtureAssets: [
        {
          destination: paths.companionDestination,
          source: paths.companionSource,
        },
      ],
      repositoryRoot: paths.repositoryRoot,
    });
    release();
  });
});
