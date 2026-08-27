import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

import { SettingsForm } from "@/components/settings/settings-form";

describe("Settings Firebase auth readiness", () => {
  it("keeps permanent deletion disabled during the initial full-page Firebase restore", () => {
    const markup = renderToStaticMarkup(
      <SettingsForm
        canMutate
        equipmentProfileKind="dumbbells"
        firebaseConfig={{
          apiKey: "public-api-key",
          appId: "public-app-id",
          authDomain: "project.firebaseapp.com",
          projectId: "project",
        }}
        initialPreferences={{
          reducedMotion: false,
          timezone: "America/Chicago",
          unitSystem: "imperial",
          updatedAt: "2026-08-27T12:00:00.000Z",
        }}
        ownerUid="server-derived-owner"
        viewerProvider="password"
      />,
    );

    expect(markup).toContain("Checking the browser Firebase sign-in");
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Review permanent deletion<\/button>/);
    expect(markup).not.toContain("server-derived-owner");
  });
});
