import type { ComponentProps, ReactNode } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const observedLinks = vi.hoisted(() => [] as Array<{
  href: string;
  label: string;
  prefetch: boolean | undefined;
}>);

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    prefetch,
    ...props
  }: ComponentProps<"a"> & Readonly<{
    children?: ReactNode;
    href: string;
    prefetch?: boolean;
  }>) => {
    const label = renderToStaticMarkup(<>{children}</>)
      .replace(/<[^>]+>/gu, " ")
      .replace(/\s+/gu, " ")
      .trim();
    observedLinks.push({ href, label, prefetch });
    return <a href={href} {...props}>{children}</a>;
  },
}));

import { PublicShell } from "@/components/layout/public-shell";
import { ProgramExplorer } from "@/components/program/program-explorer";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { createStarterProgram } from "@/domain/programs/starter";

function source(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("ordinary public account entry", () => {
  beforeEach(() => {
    observedLinks.length = 0;
  });

  it("keeps cached public chrome identity-neutral and enters through /app", () => {
    renderToStaticMarkup(
      <PublicShell current="program"><h1>Program</h1></PublicShell>,
    );

    expect(observedLinks).toContainEqual({
      href: "/app",
      label: expect.stringContaining("My workouts"),
      prefetch: false,
    });
    expect(source("src/components/layout/public-shell.tsx")).not.toMatch(
      /getCurrentViewer|cookies\(|mwp_session/u,
    );
  });

  it("uses the same protected entry from the program-specific chrome", () => {
    renderToStaticMarkup(
      <ProgramExplorer
        barbellProgram={createStarterProgram(EQUIPMENT_PROFILES.barbell)}
        dumbbellProgram={createStarterProgram(EQUIPMENT_PROFILES.dumbbells)}
        initialProfile="dumbbells"
      />,
    );

    expect(observedLinks.filter(({ label }) => label.includes("My workouts")))
      .toEqual([
        { href: "/app", label: expect.stringContaining("My workouts"), prefetch: false },
        { href: "/app", label: expect.stringContaining("My workouts"), prefetch: false },
      ]);
  });

  it("labels public program and day content as a starter example with /app entry", () => {
    const explorer = source("src/components/program/program-explorer.tsx");
    const day = source("src/app/program/[day]/page.tsx");

    expect(explorer).toContain("Five-day starter example");
    expect(explorer).toContain("Starter preview · not saved");
    expect(day).toContain("Five-day starter example");
    expect(day).toContain("Starter preview · not saved");
    expect(day).toContain('href="/app"');
    expect(day).toContain("My workouts");
  });

  it("routes contextual public save actions through the protected boundary", () => {
    for (const path of ["src/app/page.tsx", "src/app/sample-workout/page.tsx"]) {
      const contents = source(path);
      expect(contents).not.toContain('href="/sign-in"');
      expect(contents).toContain('href="/app"');
      expect(contents).toMatch(/href="\/app"\s+prefetch=\{false\}/u);
    }
  });
});
