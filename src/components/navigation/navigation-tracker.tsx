"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  currentLocation,
  recordNavigation,
  refreshCurrentLocation,
  takePendingFocus,
} from "@/components/navigation/navigation-history";

function focusAnchoredElement(id: string): void {
  const element = document.getElementById(id);
  if (!element) return;
  if (window.location.hash === `#${id}`) element.scrollIntoView({ block: "center" });
  if (element.tabIndex < 0 && !element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
  element.focus({ preventScroll: true });
}

/**
 * Remembers the previous same-tab page for BackLink and finishes a back
 * navigation by focusing the row the person came from. Renders nothing.
 */
export function NavigationTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const location = currentLocation();
    recordNavigation(location);
    const pending = takePendingFocus(location);
    if (!pending) return;
    // Let the router finish its own scroll restoration first.
    const frame = window.requestAnimationFrame(() => focusAnchoredElement(pending.id));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    // Capture the exact page (query and hash included) right before leaving it.
    const refresh = () => refreshCurrentLocation(currentLocation());
    document.addEventListener("click", refresh, true);
    window.addEventListener("pagehide", refresh);
    return () => {
      document.removeEventListener("click", refresh, true);
      window.removeEventListener("pagehide", refresh);
    };
  }, []);

  return null;
}
