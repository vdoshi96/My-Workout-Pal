import type { Page } from "@playwright/test";

// Measures rendered contrast for every visible interactive element in the states a person meets:
// default, hover, keyboard focus (real Tab traversal, so :focus-visible applies), selected/current and
// disabled. Translucent backgrounds are composited down to an opaque colour. Used by the state-contrast
// browser tests and by the design-review capture tool.

export type ContrastSample = Readonly<{
  screen: string;
  signature: string;
  state: "default" | "hover" | "focus" | "selected" | "disabled";
  text: string;
  foreground: string;
  background: string;
  overImage: boolean;
  ratio: number;
  large: boolean;
  required: number;
  boundary: Readonly<{ color: string; against: string; ratio: number }> | null;
}>;

export async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].filter((image) => !image.complete).map(
        (image) => new Promise((done) => { image.addEventListener("load", done, { once: true }); image.addEventListener("error", done, { once: true }); }),
      ),
    );
  });
}

// Runs in the page. Measures every visible interactive element, dedupes by visual signature,
// and marks one representative per signature so hover and focus can be sampled afterwards.
async function measure(page: Page, screen: string, state: ContrastSample["state"] | "auto", only?: string) {
  return page.evaluate(
    ({ screen, state, only }) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      const parse = (value: string): [number, number, number, number] => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = "#000";
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
        return [r!, g!, b!, a! / 255];
      };
      const blend = (top: [number, number, number, number], bottom: [number, number, number, number]): [number, number, number, number] => {
        const a = top[3];
        return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
      };
      const luminance = ([r, g, b]: number[]) => {
        const channel = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!);
      };
      const ratio = (a: number[], b: number[]) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return Math.round(((x! + 0.05) / (y! + 0.05)) * 100) / 100; };
      const hex = (c: number[]) => `#${c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
      const backgroundOf = (element: Element | null): { color: [number, number, number, number]; overImage: boolean } => {
        const layers: [number, number, number, number][] = [];
        let overImage = false;
        for (let node = element; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (style.backgroundImage !== "none" && !style.backgroundImage.startsWith("linear-gradient(rgba(0, 0, 0, 0)")) overImage = true;
          const color = parse(style.backgroundColor);
          if (color[3] > 0) { layers.push(color); if (color[3] >= 1) break; }
        }
        let result: [number, number, number, number] = [255, 255, 255, 1];
        for (const layer of layers.reverse()) result = blend(layer, result);
        return { color: result, overImage };
      };
      const selector = "a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=radio], [role=link], label:has(input[type=radio]), label:has(input[type=checkbox])";
      const candidates = only ? [...document.querySelectorAll(`[data-capture-sig="${only}"]`)] : [...document.querySelectorAll(selector)];
      const seen = new Set<string>();
      const samples: unknown[] = [];
      let index = Number(document.body.dataset["captureSigCount"] ?? "0");
      for (const element of candidates) {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (box.width < 2 || box.height < 2 || style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) continue;
        const selected = element.matches("[aria-current]:not([aria-current=false]), [aria-pressed=true], [aria-selected=true], [aria-checked=true], :checked, label:has(input:checked)");
        const disabled = element.matches(":disabled, [aria-disabled=true]");
        const resolvedState = state === "auto" ? (disabled ? "disabled" : selected ? "selected" : "default") : state;
        const signature = `${element.tagName.toLowerCase()}.${[...element.classList].sort().join(".")}|${resolvedState}`;
        const background = backgroundOf(element);
        const foreground = blend(parse(style.color), background.color);
        // Group only elements that look identical, so differently styled class-less links stay separate.
        const visualKey = `${signature}|${hex(foreground)}|${hex(background.color)}|${style.borderTopColor}`;
        if (!only && seen.has(visualKey)) continue;
        seen.add(visualKey);
        if (!only && !element.hasAttribute("data-capture-sig")) element.setAttribute("data-capture-sig", String(index++));
        const size = parseFloat(style.fontSize);
        const weight = Number(style.fontWeight);
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        const parentBackground = backgroundOf(element.parentElement).color;
        let boundary: { color: string; against: string; ratio: number } | null = null;
        const outlineWidth = parseFloat(style.outlineWidth);
        const edgeOf = (node: Element) => {
          const nodeStyle = getComputedStyle(node);
          const outside = backgroundOf(node.parentElement).color;
          const border = parse(nodeStyle.borderTopColor);
          if (parseFloat(nodeStyle.borderTopWidth) > 0 && nodeStyle.borderTopStyle !== "none" && border[3] > 0) {
            const edge = blend(border, outside);
            return { color: hex(edge), against: hex(outside), ratio: ratio(edge, outside) };
          }
          const shadowColor = nodeStyle.boxShadow.includes("inset") ? nodeStyle.boxShadow.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}/i)?.[0] : undefined;
          if (shadowColor && parse(shadowColor)[3] > 0) {
            const edge = blend(parse(shadowColor), outside);
            return { color: hex(edge), against: hex(outside), ratio: ratio(edge, outside) };
          }
          const fill = parse(nodeStyle.backgroundColor);
          if (fill[3] > 0) {
            const own = blend(fill, outside);
            return { color: hex(own), against: hex(outside), ratio: ratio(own, outside) };
          }
          return null;
        };
        if (element.matches("input[type=radio], input[type=checkbox]")) {
          boundary = null;
        } else if (resolvedState === "focus") {
          if (style.outlineStyle === "auto") boundary = { color: "browser default", against: hex(parentBackground), ratio: 3 };
          else if (style.outlineStyle !== "none" && outlineWidth > 0) {
            const outline = blend(parse(style.outlineColor), parentBackground);
            boundary = { color: hex(outline), against: hex(parentBackground), ratio: ratio(outline, parentBackground) };
          } else boundary = { color: "none", against: hex(parentBackground), ratio: 0 };
        } else {
          boundary = edgeOf(element) ?? (element.firstElementChild instanceof HTMLElement && element.tagName === "LABEL" ? edgeOf(element.firstElementChild.matches("input") ? (element.children[1] ?? element) : element.firstElementChild) : null);
        }
        samples.push({
          screen,
          signature,
          state: resolvedState,
          text: (element.textContent || element.getAttribute("aria-label") || (element as HTMLInputElement).value || "").replace(/\s+/g, " ").trim().slice(0, 48),
          foreground: hex(foreground),
          background: hex(background.color),
          overImage: background.overImage,
          ratio: ratio(foreground, background.color),
          large,
          required: large ? 3 : 4.5,
          boundary,
        });
      }
      document.body.dataset["captureSigCount"] = String(index);
      return samples as ContrastSample[];
    },
    { screen, state, only },
  );
}

/** Samples default, selected and disabled states, plus hover and keyboard focus when `interactive` is true. */
export async function sampleStates(page: Page, name: string, { interactive }: Readonly<{ interactive: boolean }>) {
  const samples = [...(await measure(page, name, "auto"))];
  if (interactive) {
    const signatures = await page.locator("[data-capture-sig]").evaluateAll((elements) => elements.map((element) => element.getAttribute("data-capture-sig")!));
    for (const signature of signatures.slice(0, 40)) {
      const target = page.locator(`[data-capture-sig="${signature}"]`).first();
      if (!(await target.isVisible().catch(() => false))) continue;
      if (await target.isDisabled().catch(() => false)) continue;
      await target.hover({ timeout: 500 }).catch(() => undefined);
      samples.push(...(await measure(page, name, "hover", signature)));
    }
    await page.mouse.move(0, 0);
    // Real keyboard traversal, so :focus-visible styles apply exactly as a keyboard user sees them.
    await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
    const seen = new Set<string>();
    for (let index = 0; index < 60; index += 1) {
      await page.keyboard.press("Tab");
      // Let outline and colour transitions finish before reading the ring.
      await page.waitForTimeout(250);
      const marker = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active === document.body) return null;
        active.setAttribute("data-capture-focus", "1");
        return `${active.tagName}.${[...active.classList].sort().join(".")}`;
      });
      if (!marker) break;
      // The development-only Next.js overlay is not part of the product.
      if (marker.startsWith("NEXTJS-PORTAL")) { await page.evaluate(() => document.querySelector("[data-capture-focus]")?.removeAttribute("data-capture-focus")); continue; }
      if (!seen.has(marker)) {
        seen.add(marker);
        await page.evaluate(() => { const active = document.querySelector("[data-capture-focus]"); active?.setAttribute("data-capture-sig", "focus-target"); });
        samples.push(...(await measure(page, name, "focus", "focus-target")));
        await page.evaluate(() => document.querySelector("[data-capture-sig=focus-target]")?.removeAttribute("data-capture-sig"));
      }
      await page.evaluate(() => document.querySelector("[data-capture-focus]")?.removeAttribute("data-capture-focus"));
    }
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  }
  await page.evaluate(() => { document.querySelectorAll("[data-capture-sig]").forEach((element) => element.removeAttribute("data-capture-sig")); delete document.body.dataset["captureSigCount"]; });
  await page.evaluate(() => { document.querySelectorAll("[data-capture-sig]").forEach((element) => element.removeAttribute("data-capture-sig")); delete document.body.dataset["captureSigCount"]; });
  return samples;
}

/** Every sample that falls below WCAG AA: text below its threshold, or a focus ring or selected edge below 3:1. */
export function contrastFailures(samples: readonly ContrastSample[]) {
  return samples.filter((sample) =>
    (sample.text !== "" && sample.ratio < sample.required) ||
    ((sample.state === "focus" || sample.state === "selected") && sample.boundary !== null && sample.boundary.ratio < 3),
  ).map((sample) => `${sample.screen} ${sample.state} ${sample.signature.split("|")[0]} "${sample.text}" text ${sample.foreground}/${sample.background} ${sample.ratio}` +
    (sample.boundary ? ` edge ${sample.boundary.color}/${sample.boundary.against} ${sample.boundary.ratio}` : ""));
}
