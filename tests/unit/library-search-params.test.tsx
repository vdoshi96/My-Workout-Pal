import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import LibraryPage from "@/app/library/page";

describe("public library search parameters", () => {
  it("fails closed to the unfiltered catalog when q is repeated", async () => {
    const page = await LibraryPage({
      searchParams: Promise.resolve({
        equipment: "dumbbells",
        q: ["not a real movement", "squat"],
      }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Exercise library");
    expect(markup).not.toContain("No compatible match");
    expect(markup).not.toContain('name="q" value="not a real movement"');
  });
});
