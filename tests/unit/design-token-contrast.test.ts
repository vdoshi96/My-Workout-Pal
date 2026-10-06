import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CONTRAST_PAIRS } from "@/design/contrast-pairs";

const stylesheet = readFileSync(resolve(process.cwd(), "src/app/studio-pals.css"), "utf8");

function tokenBlock(source: string): Record<string, string> {
  return Object.fromEntries([...source.matchAll(/(--[a-z-]+)\s*:\s*(#[0-9a-f]{6})\b/giu)].map((match) => [match[1]!, match[2]!.toLowerCase()]));
}

function themes() {
  const light = stylesheet.match(/:root\s*\{([^}]*)\}/u)?.[1];
  const dark = stylesheet.match(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/u)?.[1];
  if (!light || !dark) throw new Error("studio-pals.css must declare :root tokens for light and dark themes");
  const lightTokens = tokenBlock(light);
  return { light: lightTokens, dark: { ...lightTokens, ...tokenBlock(dark) } };
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [r, g, b] = channels.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function ratio(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
}

describe("design token contrast", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const pair of CONTRAST_PAIRS) {
      it(`${theme}: ${pair.state} ${pair.use} meets AA`, () => {
        const tokens = themes()[theme];
        const foreground = tokens[pair.foreground];
        const background = tokens[pair.background];
        expect(foreground, `${pair.foreground} is declared`).toMatch(/^#[0-9a-f]{6}$/u);
        expect(background, `${pair.background} is declared`).toMatch(/^#[0-9a-f]{6}$/u);
        const minimum = pair.kind === "text" ? 4.5 : 3;
        expect(ratio(foreground!, background!)).toBeGreaterThanOrEqual(minimum);
      });
    }
  }

  it("never pairs light text with a mid-tone fill", () => {
    for (const tokens of Object.values(themes())) {
      for (const pair of CONTRAST_PAIRS.filter((candidate) => candidate.kind === "text")) {
        const foreground = luminance(tokens[pair.foreground]!);
        const background = luminance(tokens[pair.background]!);
        const midTone = background > 0.12 && background < 0.45;
        expect(midTone && foreground > background, `${pair.use}: light text on a mid-tone`).toBe(false);
      }
    }
  });
});
