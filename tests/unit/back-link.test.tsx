import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { authenticatedDestinationIsCurrent } from "@/components/layout/authenticated-nav";
import { BackLink } from "@/components/navigation/back-link";
import {
  anchorId,
  comparablePage,
  nextNavigationRecord,
  shouldUseHistoryBack,
} from "@/components/navigation/navigation-history";

describe("BackLink", () => {
  it("renders a labelled anchor with the arrow icon and the resolved href", () => {
    const markup = renderToStaticMarkup(
      <BackLink target={{ href: "/app/program/push#movement-3", label: "Back to Day 1 · Push" }} />,
    );

    expect(markup).toContain('class="back-link pal-back-link"');
    expect(markup).toContain('href="/app/program/push#movement-3"');
    expect(markup).toContain("<span>Back to Day 1 · Push</span>");
    expect(markup).toContain('<path d="M19 12H5M11 18l-6-6 6-6"></path>');
  });
});

describe("BackLink history decision", () => {
  const record = { previous: "/app/library?q=row&from=%2Fapp", current: "/app/library/goblet-squat?from=x" };

  it("steps back when the previous same-tab page is exactly the target", () => {
    expect(shouldUseHistoryBack({
      record,
      location: "/app/library/goblet-squat?from=x",
      targetHref: "/app/library?q=row#movement-goblet-squat",
      historyLength: 3,
    })).toBe(true);
  });

  it("ignores query order and the from breadcrumb when comparing pages", () => {
    expect(comparablePage("/library?q=row&equipment=barbell&from=%2Fprogram#movement-x"))
      .toBe("/library?equipment=barbell&q=row");
  });

  it.each([
    ["a different previous page", { ...record, previous: "/app/progress" }, "/app/library/goblet-squat?from=x", 3, false],
    ["a stale record for another page", record, "/app/history", 3, false],
    ["a fresh tab", record, "/app/library/goblet-squat?from=x", 1, false],
    ["a guarded routine draft", record, "/app/library/goblet-squat?from=x", 3, true],
  ] as const)("navigates forward for %s", (_case, candidate, location, historyLength, guarded) => {
    expect(shouldUseHistoryBack({
      record: candidate,
      location,
      targetHref: "/app/library?q=row",
      historyLength,
      guarded,
    })).toBe(false);
  });

  it("navigates forward without any record", () => {
    expect(shouldUseHistoryBack({ record: null, location: "/app", targetHref: "/app", historyLength: 4 })).toBe(false);
  });

  it("keeps the record on reload and shifts it on a new page", () => {
    const first = nextNavigationRecord(null, "/app");
    expect(first).toEqual({ previous: null, current: "/app" });
    expect(nextNavigationRecord(first, "/app")).toBe(first);
    expect(nextNavigationRecord(first, "/app/program/push")).toEqual({
      previous: "/app",
      current: "/app/program/push",
    });
  });

  it("only focuses our own row anchors after arriving", () => {
    expect(anchorId("/app/program/push#movement-3")).toBe("movement-3");
    expect(anchorId("/app/prs#record-max-weight-abc")).toBe("record-max-weight-abc");
    expect(anchorId("/app/history")).toBeUndefined();
    expect(anchorId("/app#main-content")).toBeUndefined();
  });
});

describe("tab highlighting follows the origin", () => {
  it("keeps Today selected for a day opened from Today", () => {
    expect(authenticatedDestinationIsCurrent("/app/program/push", "/app", "/app?day=push")).toBe(true);
    expect(authenticatedDestinationIsCurrent("/app/program/push", "/app/program/edit", "/app?day=push")).toBe(false);
  });

  it("keeps Routine selected for a day opened elsewhere or directly", () => {
    expect(authenticatedDestinationIsCurrent("/app/program/push", "/app/program/edit", "/app/program/edit?day=push")).toBe(true);
    expect(authenticatedDestinationIsCurrent("/app/program/push", "/app/program/edit")).toBe(true);
    expect(authenticatedDestinationIsCurrent("/app/program/edit", "/app", "/app")).toBe(false);
  });
});
