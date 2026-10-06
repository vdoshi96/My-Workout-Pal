"use client";

import { useEffect } from "react";

const ARRIVAL_FOCUS_KEY = "mwp:arrival-focus";

/**
 * Asks the next screen to move focus to its heading once. Used when a flow ends by replacing the
 * screen (finishing a workout, closing the tour), so the control that had focus disappears.
 */
export function requestArrivalFocus(headingId: string) {
  try {
    window.sessionStorage.setItem(ARRIVAL_FOCUS_KEY, headingId);
  } catch {
    // Storage can be unavailable (private mode); focus then stays where the browser puts it.
  }
}

/** Focuses `headingId` once on mount when the previous screen requested it. */
export function ArrivalFocus({ headingId }: Readonly<{ headingId: string }>) {
  useEffect(() => {
    let requested: string | null = null;
    try {
      requested = window.sessionStorage.getItem(ARRIVAL_FOCUS_KEY);
      if (requested === headingId) window.sessionStorage.removeItem(ARRIVAL_FOCUS_KEY);
    } catch {
      return;
    }
    if (requested !== headingId) return;
    // Wait a frame so the router's own scroll-and-focus pass has finished.
    const frame = window.requestAnimationFrame(() => document.getElementById(headingId)?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [headingId]);
  return null;
}
