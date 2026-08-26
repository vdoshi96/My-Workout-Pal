import type { ComponentProps, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const observedLinks = vi.hoisted(() => [] as Array<{
  href: string;
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
    observedLinks.push({ href, prefetch });
    return <a href={href} {...props}>{children}</a>;
  },
}));

import { PublicShell } from "@/components/layout/public-shell";
import { ProgramExplorer } from "@/components/program/program-explorer";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { createStarterProgram } from "@/domain/programs/starter";

function expectPublicChromePrefetchDisabled() {
  const chromeDestinations = observedLinks.filter(({ href }) =>
    ["/", "/program", "/library", "/sample-progress", "/sign-in"].includes(href),
  );

  expect(chromeDestinations.length).toBeGreaterThan(0);
  expect(chromeDestinations).toEqual(
    chromeDestinations.map((link) => ({ ...link, prefetch: false })),
  );
}

describe("public navigation prefetch policy", () => {
  beforeEach(() => {
    observedLinks.length = 0;
  });

  it("keeps the shared public shell from issuing speculative RSC requests", () => {
    renderToStaticMarkup(
      <PublicShell current="program"><h1>Program</h1></PublicShell>,
    );

    expectPublicChromePrefetchDisabled();
  });

  it("keeps the interactive program chrome from issuing speculative RSC requests", () => {
    renderToStaticMarkup(
      <ProgramExplorer
        barbellProgram={createStarterProgram(EQUIPMENT_PROFILES.barbell)}
        dumbbellProgram={createStarterProgram(EQUIPMENT_PROFILES.dumbbells)}
        initialProfile="dumbbells"
      />,
    );

    expectPublicChromePrefetchDisabled();
  });
});
