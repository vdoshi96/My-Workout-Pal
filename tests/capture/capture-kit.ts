import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Page, TestInfo } from "@playwright/test";

import { sampleStates, settle } from "../support/state-contrast";

// Shared helpers for design-review capture. Screenshots and contrast samples go to
// docs/qa/runs/capture/<project>/, which Git ignores.

export { settle } from "../support/state-contrast";

function outputDirectory(info: TestInfo) {
  const directory = resolve(process.cwd(), "docs/qa/runs/capture", info.project.name);
  mkdirSync(directory, { recursive: true });
  return directory;
}

export async function capture(page: Page, info: TestInfo, name: string, options: { fullPage?: boolean } = {}) {
  await settle(page);
  const directory = outputDirectory(info);
  const path = resolve(directory, `${name}.png`);
  const viewport = page.viewportSize();
  if ((options.fullPage ?? true) && viewport) {
    // Grow the viewport to the page instead of a stitched full-page shot, so fixed bars sit at the
    // real bottom and nothing hidden off-screen (like the skip link) is painted mid-page.
    const height = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
    await page.setViewportSize({ width: viewport.width, height: Math.min(Math.max(height, viewport.height), 12000) });
    await settle(page);
    await page.screenshot({ path, animations: "disabled" });
    await page.setViewportSize(viewport);
  } else {
    await page.screenshot({ path, animations: "disabled" });
  }
  const samples = await sampleStates(page, name, { interactive: !info.project.name.startsWith("phone") });
  writeFileSync(resolve(directory, `${name}.contrast.json`), JSON.stringify(samples, null, 2));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) writeFileSync(resolve(directory, `${name}.overflow.txt`), `${overflow}px horizontal overflow\n`);
}

export async function step(name: string, body: () => Promise<void>) {
  try {
    await body();
  } catch (error) {
    console.warn(`capture step "${name}" failed: ${(error as Error).message.split("\n")[0]}`);
  }
}
