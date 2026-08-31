import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import AccountError from "@/app/app/error";
import AccountLoading from "@/app/app/loading";

describe("personal home route states", () => {
  it("describes the full personal-home read while loading", () => {
    const markup = renderToStaticMarkup(<AccountLoading />);

    expect(markup).toContain("Loading your home…");
    expect(markup).toContain("routine, saved progress, and any resumable workout");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).not.toContain("data-companion-placement");
  });

  it("keeps a failed home read recoverable without implying a write", () => {
    const markup = renderToStaticMarkup(
      <AccountError error={new Error("read failed")} reset={vi.fn()} />,
    );

    expect(markup).toContain("Your home did not load.");
    expect(markup).toContain("No routine or workout changes were made.");
    expect(markup).toContain("Try again");
    expect(markup).not.toContain("data-companion-placement");
  });
});
