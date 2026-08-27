import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import HarnessSignInPage, {
  normalizeHarnessWorkoutReturn,
} from "../../tests/fixtures/authenticated-app/app/sign-in/page";

const sessionId = "10000000-0000-4000-8000-000000000031";

describe("authenticated harness synthetic reauthentication surface", () => {
  it("returns only to one exact workout route and labels the synthetic boundary", async () => {
    expect(normalizeHarnessWorkoutReturn(`/workout/${sessionId}`)).toBe(
      `/workout/${sessionId}`,
    );
    const markup = renderToStaticMarkup(
      await HarnessSignInPage({
        searchParams: Promise.resolve({
          returnTo: `/workout/${sessionId}`,
        }),
      }),
    );

    expect(markup).toContain("Synthetic reauthentication boundary");
    expect(markup).toContain("Local authenticated QA harness");
    expect(markup).toContain("Return as the current synthetic viewer");
    expect(markup).toContain(`href="/workout/${sessionId}"`);
    expect(markup).not.toContain("Firebase");
  });

  it("fails repeated, malformed, non-workout, and external targets to the member home", async () => {
    for (const value of [
      undefined,
      ["/workout/first", "/workout/second"],
      "/workout/not-a-uuid",
      "/app",
      "//attacker.example/workout/10000000-0000-4000-8000-000000000031",
      "https://attacker.example/workout/10000000-0000-4000-8000-000000000031",
    ]) {
      expect(normalizeHarnessWorkoutReturn(value)).toBe("/app");
    }
  });
});
