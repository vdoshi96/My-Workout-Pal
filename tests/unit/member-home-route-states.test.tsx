import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import AccountError from "@/app/app/error";
import AccountLoading from "@/app/app/loading";

describe("personal home route states", () => {
  it("describes the full personal-home read while loading", () => {
    const markup = renderToStaticMarkup(<AccountLoading />);

    expect(markup).toContain("Loading…");
    expect(markup).not.toContain("routine, saved progress, and any resumable workout");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).not.toContain("data-companion-placement");
  });

  it("keeps a failed home read recoverable without implying a write", () => {
    const markup = renderToStaticMarkup(
      <AccountError error={new Error("read failed")} reset={vi.fn()} />,
    );

    expect(markup).toContain("This page didn&#x27;t load");
    expect(markup).toContain("Nothing was changed.");
    expect(markup).toContain("Try again");
    expect(markup).not.toContain("data-companion-placement");
  });
});
