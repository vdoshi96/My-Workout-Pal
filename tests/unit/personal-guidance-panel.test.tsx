import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PersonalGuidancePanel } from "@/components/workout/personal-guidance-panel";

describe("personal guidance presentation", () => {
  it("labels owner links privately and uses only the normalized privacy embed", () => {
    const markup = renderToStaticMarkup(
      <PersonalGuidancePanel
        links={[
          {
            kind: "youtube",
            canonicalUrl: "https://www.youtube.com/watch?v=AbCdEfGhI01",
            videoId: "AbCdEfGhI01",
            embedUrl: "https://www.youtube-nocookie.com/embed/AbCdEfGhI01",
          },
          {
            kind: "external",
            canonicalUrl: "https://example.com/carry-guide",
          },
        ]}
      />,
    );

    expect(markup).toContain("Your link");
    expect(markup).not.toContain("Approved");
    expect(markup).toContain(
      'src="https://www.youtube-nocookie.com/embed/AbCdEfGhI01"',
    );
    expect(markup).toContain('href="https://example.com/carry-guide"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer noopener"');
    expect(markup).toContain('referrerPolicy="no-referrer"');
    expect(markup).not.toContain("<script");
  });
});
