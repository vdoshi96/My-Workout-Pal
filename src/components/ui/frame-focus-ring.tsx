"use client";

import { useEffect } from "react";

/**
 * Browsers stop matching `:focus` on an iframe once keyboard focus moves inside it, so the video
 * frame would show no focus ring. This marks the focused frame's wrapper (`data-frame-focused`),
 * which CSS outlines. Renders nothing.
 */
export function FrameFocusRing() {
  useEffect(() => {
    const mark = () => {
      for (const host of document.querySelectorAll("[data-frame-focused]")) host.removeAttribute("data-frame-focused");
      const active = document.activeElement;
      if (active instanceof HTMLIFrameElement) active.parentElement?.setAttribute("data-frame-focused", "");
    };
    // The active element updates just after the window loses focus to the frame.
    const markSoon = () => window.setTimeout(mark, 0);
    window.addEventListener("blur", markSoon);
    window.addEventListener("focus", mark);
    document.addEventListener("focusin", mark);
    return () => {
      window.removeEventListener("blur", markSoon);
      window.removeEventListener("focus", mark);
      document.removeEventListener("focusin", mark);
    };
  }, []);
  return null;
}
