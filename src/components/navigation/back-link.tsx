"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

import {
  currentLocation,
  readNavigationRecord,
  requestFocusAfterNavigation,
  shouldUseHistoryBack,
} from "@/components/navigation/navigation-history";
import { Icon } from "@/components/ui/icon";
import type { BackTarget } from "@/domain/navigation/back-target";

function isGuardedEntry(state: unknown): boolean {
  return typeof state === "object" && state !== null && (state as Record<string, unknown>)["mwpProgramDraftGuard"] === true;
}

/**
 * The labelled "Back to …" control at the top of every drill-down.
 * When the previous entry in this tab is exactly the target, it steps back in
 * history so the browser restores scroll; otherwise it follows the href and the
 * NavigationTracker scrolls to and focuses the anchored row.
 */
export function BackLink({ target }: Readonly<{ target: BackTarget }>) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    requestFocusAfterNavigation(target.href);
    if (
      shouldUseHistoryBack({
        record: readNavigationRecord(),
        location: currentLocation(),
        targetHref: target.href,
        historyLength: window.history.length,
        guarded: isGuardedEntry(window.history.state),
      })
    ) {
      event.preventDefault();
      window.history.back();
    }
  }

  return (
    <Link className="back-link pal-back-link" href={target.href} onClick={handleClick} prefetch={false}>
      <Icon name="arrow-left" />
      <span>{target.label}</span>
    </Link>
  );
}
