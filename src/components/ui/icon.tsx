import type { SVGProps } from "react";

type IconName =
  | "arrow-left"
  | "arrow-right"
  | "check"
  | "chevron-right"
  | "dumbbell"
  | "history"
  | "library"
  | "map"
  | "progress"
  | "run"
  | "sample"
  | "settings"
  | "sign-in"
  | "walk";

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  const common = {
    "aria-hidden": true,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
    ...props,
  };

  if (name === "dumbbell") {
    return <svg {...common}><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" /></svg>;
  }
  if (name === "map") {
    return <svg {...common}><path d="m3 6 5-2 8 3 5-2v13l-5 2-8-3-5 2Z" /><path d="M8 4v13M16 7v13" /></svg>;
  }
  if (name === "library") {
    return <svg {...common}><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22Z" /><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22Z" /></svg>;
  }
  if (name === "sample") {
    return <svg {...common}><path d="m4 18 5-9 4 6 2-3 5 6Z" /><path d="M6 5h12" /><path d="M9 2v6M15 2v6" /></svg>;
  }
  if (name === "history") {
    return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></svg>;
  }
  if (name === "progress") {
    return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20V7" /><path d="M2 20h22" /></svg>;
  }
  if (name === "settings") {
    return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21h-4v-.08a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3v-4h.08a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3h4v.08a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21v4h-.08a1.7 1.7 0 0 0-1.52 1Z" /></svg>;
  }
  if (name === "sign-in") {
    return <svg {...common}><circle cx="12" cy="7" r="4" /><path d="M4 22a8 8 0 0 1 16 0" /></svg>;
  }
  if (name === "walk") {
    return <svg {...common}><circle cx="13" cy="4" r="2" /><path d="m10 22 2-7-3-3 2-5 4 3 3 1M12 15l4 7M9 12l-5 4" /></svg>;
  }
  if (name === "run") {
    return <svg {...common}><circle cx="15" cy="4" r="2" /><path d="m7 22 4-6 2-4-4-2-3 4M13 12l4 3 3-1M11 16l5 6" /></svg>;
  }
  if (name === "arrow-left") {
    return <svg {...common}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>;
  }
  if (name === "arrow-right") {
    return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
  }
  if (name === "check") {
    return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  }
  return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>;
}
