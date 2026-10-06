import { describe, expect, it } from "vitest";

import {
  resolveBackTarget,
  withFrom,
  type BackTarget,
} from "@/domain/navigation/back-target";

const SESSION_ID = "4f9c2b1e-8a3d-4c5e-9f10-2a3b4c5d6e7f";
const memberFallback: BackTarget = { href: "/app", label: "Back to Today" };
const publicFallback: BackTarget = { href: "/library?equipment=dumbbells", label: "Back to Library" };
const days = [
  { dayKey: "push", dayNumber: 1, displayName: "Push" },
  { dayKey: "pull", dayNumber: 2, displayName: "Pull" },
] as const;

function member(from: string | string[] | undefined | null, withDays = true): BackTarget {
  return resolveBackTarget(from, {
    area: "member",
    fallback: memberFallback,
    ...(withDays ? { days } : {}),
  });
}

function guest(from: string | string[] | undefined | null): BackTarget {
  return resolveBackTarget(from, { area: "public", fallback: publicFallback });
}

describe("resolveBackTarget for member origins", () => {
  it.each([
    ["/app", { href: "/app", label: "Back to Today" }],
    ["/app?day=pull", { href: "/app?day=pull", label: "Back to Today" }],
    ["/app?day=pull#movement-2", { href: "/app?day=pull#movement-2", label: "Back to Today" }],
    ["/app/program/pull", { href: "/app/program/pull", label: "Back to Day 2 · Pull" }],
    ["/app/program/push#movement-3", { href: "/app/program/push#movement-3", label: "Back to Day 1 · Push" }],
    ["/app/library", { href: "/app/library", label: "Back to Library" }],
    ["/app/library?q=goblet squat", { href: "/app/library?q=goblet+squat", label: "Back to Library" }],
    ["/app/library?q=row#movement-dumbbell-row", { href: "/app/library?q=row#movement-dumbbell-row", label: "Back to Library" }],
    ["/app/library/custom", { href: "/app/library/custom", label: "Back to your movements" }],
    ["/app/progress", { href: "/app/progress", label: "Back to Progress" }],
    [`/app/progress#session-${SESSION_ID}`, { href: `/app/progress#session-${SESSION_ID}`, label: "Back to Progress" }],
    ["/app/prs#record-max-weight-goblet", { href: "/app/prs#record-max-weight-goblet", label: "Back to your records" }],
    ["/app/history", { href: "/app/history", label: "Back to History" }],
    [
      `/app/history?state=completed&cursor=eyJvY2N1cnJlZEF0IjoiMjAyNi0wOS0wMSJ9#session-${SESSION_ID}`,
      {
        href: `/app/history?cursor=eyJvY2N1cnJlZEF0IjoiMjAyNi0wOS0wMSJ9&state=completed#session-${SESSION_ID}`,
        label: "Back to History",
      },
    ],
    ["/app/programs", { href: "/app/programs", label: "Back to Routines" }],
    ["/app/program/edit", { href: "/app/program/edit", label: "Back to your routine" }],
    ["/app/program/edit?day=pull", { href: "/app/program/edit?day=pull", label: "Back to your routine" }],
    [`/workout/${SESSION_ID}`, { href: `/workout/${SESSION_ID}`, label: "Back to your workout" }],
    [`/workout/${SESSION_ID}#exercise-4`, { href: `/workout/${SESSION_ID}#exercise-4`, label: "Back to your workout" }],
  ] as const)("accepts %s", (from, expected) => {
    expect(member(from)).toEqual(expected);
  });

  it("labels a day without known names generically and rejects days that no longer exist", () => {
    expect(member("/app/program/legs", false)).toEqual({ href: "/app/program/legs", label: "Back to your day" });
    expect(member("/app/program/legs")).toEqual(memberFallback);
  });

  it.each([
    undefined,
    null,
    "",
    ["/app/library", "/app/progress"],
    "app/library",
    "//evil.example/app",
    "/\\evil.example",
    "https://evil.example/app",
    "javascript:alert(1)",
    "/app/library%0a",
    "/app/library?q=%00",
    "/app/library\u0000",
    "/app/%2e%2e/app",
    "/app/../app/library",
    "/app/library/%2F%2Fevil",
    "/app/settings",
    "/app/history/" + SESSION_ID,
    "/app/library/goblet-squat",
    "/app/library?q=row&equipment=barbell",
    "/app/library?q=row&q=press",
    `/app/library?q=${"x".repeat(121)}`,
    "/app/history?state=paused",
    "/app/history?cursor=not*base64",
    `/app/history?cursor=${"a".repeat(513)}`,
    "/app/program/push#movement-x",
    "/app/program/push#elsewhere",
    "/app/library#movement-Bad_Slug",
    "/app/progress#session-not-a-uuid",
    "/app?day=Push Day",
    "/app?day=pull#movement-x",
    "/app#elsewhere",
    "/app?tab=today",
    "/workout/not-a-uuid",
    `/workout/${SESSION_ID}#exercise-0`,
    "/program?equipment=dumbbells",
    "/library",
    "/try",
    `/app/library?q=${"y".repeat(600)}`,
  ])("rejects %j", (from) => {
    expect(member(from as string | string[] | undefined | null)).toEqual(memberFallback);
  });
});

describe("resolveBackTarget for public origins", () => {
  it.each([
    ["/program", { href: "/program", label: "Back to the example routine" }],
    ["/program?equipment=barbell", { href: "/program?equipment=barbell", label: "Back to the example routine" }],
    ["/program/push?equipment=dumbbells", { href: "/program/push?equipment=dumbbells", label: "Back to the Push day" }],
    ["/program/lower?equipment=barbell#movement-2", { href: "/program/lower?equipment=barbell#movement-2", label: "Back to the Lower day" }],
    ["/library?equipment=barbell&q=row", { href: "/library?equipment=barbell&q=row", label: "Back to Library" }],
    ["/library?q=row&equipment=barbell#movement-barbell-row", { href: "/library?equipment=barbell&q=row#movement-barbell-row", label: "Back to Library" }],
    ["/sample-workout?day=legs&equipment=barbell", { href: "/sample-workout?day=legs&equipment=barbell", label: "Back to the example workout" }],
    ["/progress", { href: "/progress", label: "Back to Progress" }],
    ["/try", { href: "/try", label: "Back to the test drive" }],
  ] as const)("accepts %s", (from, expected) => {
    expect(guest(from)).toEqual(expected);
  });

  it.each([
    "/program/chest?equipment=dumbbells",
    "/program?equipment=kettlebell",
    "/library?equipment=dumbbells&returnTo=/app",
    "/sample-workout?day=chest",
    "/progress?view=all",
    "/app",
    "/app/library",
    `/workout/${SESSION_ID}`,
    "//library",
    "/library%09",
  ])("rejects %j", (from) => {
    expect(guest(from)).toEqual(publicFallback);
  });
});

describe("withFrom", () => {
  it("adds an encoded origin and keeps the destination anchor last", () => {
    expect(withFrom("/app/library/goblet-squat", "/app/program/push#movement-3"))
      .toBe("/app/library/goblet-squat?from=%2Fapp%2Fprogram%2Fpush%23movement-3");
    expect(withFrom("/library/goblet-squat?equipment=barbell", "/library?equipment=barbell&q=row"))
      .toBe("/library/goblet-squat?equipment=barbell&from=%2Flibrary%3Fequipment%3Dbarbell%26q%3Drow");
    expect(withFrom("/app/history/abc#top", "/app/progress"))
      .toBe("/app/history/abc?from=%2Fapp%2Fprogress#top");
  });

  it("round-trips through the resolver after the query string is decoded", () => {
    const href = withFrom("/app/library/goblet-squat", "/app/library?q=goblet squat#movement-goblet-squat");
    const from = new URL(href, "https://example.invalid").searchParams.get("from");
    expect(member(from)).toEqual({
      href: "/app/library?q=goblet+squat#movement-goblet-squat",
      label: "Back to Library",
    });
  });
});
