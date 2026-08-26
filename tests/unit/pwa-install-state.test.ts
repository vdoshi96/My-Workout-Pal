import { describe, expect, it } from "vitest";

import {
  installOfferIsVisible,
  installationIsStandalone,
  serviceWorkerUpdateIsReady,
} from "@/domain/pwa/install-state";

describe("PWA install and update state", () => {
  it("recognizes standards-based and iOS standalone modes", () => {
    expect(installationIsStandalone({ displayModeStandalone: true, navigatorStandalone: false })).toBe(true);
    expect(installationIsStandalone({ displayModeStandalone: false, navigatorStandalone: true })).toBe(true);
    expect(installationIsStandalone({ displayModeStandalone: false, navigatorStandalone: false })).toBe(false);
  });

  it("offers installation only for a captured, undismissed, uninstalled prompt", () => {
    expect(installOfferIsVisible({ dismissed: false, installed: false, promptCaptured: true })).toBe(true);
    expect(installOfferIsVisible({ dismissed: true, installed: false, promptCaptured: true })).toBe(false);
    expect(installOfferIsVisible({ dismissed: false, installed: true, promptCaptured: true })).toBe(false);
    expect(installOfferIsVisible({ dismissed: false, installed: false, promptCaptured: false })).toBe(false);
  });

  it("reports an update only when an existing controlled app gains a replacement", () => {
    expect(serviceWorkerUpdateIsReady({ hadController: true, replacementInstalled: true })).toBe(true);
    expect(serviceWorkerUpdateIsReady({ hadController: false, replacementInstalled: true })).toBe(false);
    expect(serviceWorkerUpdateIsReady({ hadController: true, replacementInstalled: false })).toBe(false);
  });
});
