import { readdir, readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const sourceRoot = new URL("../../src/", import.meta.url);

async function tsxFiles(directory: URL): Promise<URL[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) return tsxFiles(child);
    return entry.name.endsWith(".tsx") ? [child] : [];
  }));
  return nested.flat();
}

describe("strict style CSP source policy", () => {
  it("keeps application TSX free of nonce-less style attributes", async () => {
    const offenders: string[] = [];
    for (const file of await tsxFiles(sourceRoot)) {
      const source = await readFile(file, "utf8");
      if (/\bstyle\s*=/.test(source)) offenders.push(file.pathname.split("/src/")[1]!);
    }
    expect(offenders.sort()).toEqual([]);
  });
});
