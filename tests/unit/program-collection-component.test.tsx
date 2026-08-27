import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { ProgramCollection } from "@/components/program/program-collection";
import type { ProgramSummaryReadModel } from "@/server/repositories/profile-program";

const programs: readonly ProgramSummaryReadModel[] = [
  {
    dayCount: 5,
    equipmentProfileKind: "dumbbells",
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    isActive: true,
    name: "Apartment strength",
    programKey: "apartment-strength",
    revisionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    revisionNumber: 3,
    updatedAt: "2026-08-24T15:00:00.000Z",
  },
  {
    dayCount: 3,
    equipmentProfileKind: "barbell",
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    isActive: false,
    name: "Rack cycle",
    programKey: "rack-cycle",
    revisionId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    revisionNumber: 1,
    updatedAt: "2026-08-25T15:00:00.000Z",
  },
];

describe("ProgramCollection", () => {
  it("renders one textual active state and both equipment profiles", () => {
    const markup = renderToStaticMarkup(
      <ProgramCollection canMutate initialPrograms={programs} />,
    );

    expect(markup).toContain('aria-current="true"');
    expect(markup.match(/Active program/g)).toHaveLength(1);
    expect(markup).toContain("Dumbbells");
    expect(markup).toContain("Barbell + rack");
    expect(markup).toContain("Create from example");
    expect(markup).toContain("Custom starting point");
    expect(markup).toContain("5 days");
    expect(markup).toContain("3 days");
    expect(markup).toContain("Make active");
    expect(markup).toContain("Clone");
  });

  it("makes permanent controls read-only for an unverified member", () => {
    const markup = renderToStaticMarkup(
      <ProgramCollection canMutate={false} initialPrograms={programs} />,
    );

    expect(markup).toContain("read-only until you verify your email");
    expect(markup).toContain('disabled=""');
    expect(markup).toContain("Active overview");
  });
});
