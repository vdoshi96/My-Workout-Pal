import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app",
}));

import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { PublicShell } from "@/components/layout/public-shell";
import { ProgramExplorer } from "@/components/program/program-explorer";
import { EQUIPMENT_PROFILES } from "@/domain/equipment";
import { createStarterProgram } from "@/domain/programs/starter";

describe("visible labels remain in accessible names", () => {
  it("uses native brand and waypoint content instead of shorter aria-label overrides", () => {
    const explorerMarkup = renderToStaticMarkup(
      <ProgramExplorer
        barbellProgram={createStarterProgram(EQUIPMENT_PROFILES.barbell)}
        dumbbellProgram={createStarterProgram(EQUIPMENT_PROFILES.dumbbells)}
        initialProfile="dumbbells"
      />,
    );
    const publicMarkup = renderToStaticMarkup(
      <PublicShell current="library">
        <h1>Library</h1>
      </PublicShell>,
    );
    const authenticatedMarkup = renderToStaticMarkup(
      <AuthenticatedShell
        viewer={{
          authTimeSeconds: 1,
          displayName: "Verification athlete",
          eligibleForPermanentMutations: true,
          email: "athlete@example.com",
          emailVerified: true,
          provider: "password",
          uid: "accessible-label-test",
        }}
      >
        <h1>Program</h1>
      </AuthenticatedShell>,
    );

    expect(explorerMarkup).not.toContain('aria-label="My Workout Pal home"');
    expect(publicMarkup).not.toContain('aria-label="My Workout Pal home"');
    expect(authenticatedMarkup).not.toContain(
      'aria-label="My Workout Pal account home"',
    );
    expect(explorerMarkup).not.toMatch(
      /<button[^>]+aria-label="Day [1-5]: (?:Push|Pull|Legs|Upper|Lower)"/,
    );

    expect(explorerMarkup).toContain("My Workout Pal");
    expect(explorerMarkup).toContain("Your equipment-aware training route");
    for (const [number, day] of [
      [1, "Push"],
      [2, "Pull"],
      [3, "Legs"],
      [4, "Upper"],
      [5, "Lower"],
    ] as const) {
      expect(explorerMarkup).toContain(`<strong>${number}</strong><span>${day}</span>`);
    }
    expect(publicMarkup).toContain("Training route atlas");
    expect(authenticatedMarkup).toContain("Saved training route");
  });
});
