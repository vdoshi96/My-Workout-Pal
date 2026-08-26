"use client";

import { useEffect, useState } from "react";

import {
  installOfferIsVisible,
  installationIsStandalone,
  serviceWorkerUpdateIsReady,
} from "@/domain/pwa/install-state";

const INSTALL_DISMISSED_KEY = "my-workout-pal:install-dismissed";

type InstallChoice = Readonly<{ outcome: "accepted" | "dismissed"; platform: string }>;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<InstallChoice>;
}

async function probeConnection(): Promise<boolean> {
  if (!navigator.onLine) return false;
  try {
    const response = await fetch("/manifest.webmanifest", {
      cache: "no-store",
      method: "HEAD",
    });
    return response.ok;
  } catch {
    return false;
  }
}

function currentInstallationIsStandalone(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return installationIsStandalone({
    displayModeStandalone: window.matchMedia("(display-mode: standalone)").matches,
    navigatorStandalone: navigatorWithStandalone.standalone === true,
  });
}

function readInstallDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(INSTALL_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberInstallDismissed(): void {
  try {
    window.sessionStorage.setItem(INSTALL_DISMISSED_KEY, "true");
  } catch {
    // Storage can be blocked. The dismissal still applies for this mounted page.
  }
}

export function PwaRegistration() {
  const [online, setOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent>();
  const [installDismissed, setInstallDismissed] = useState(() =>
    typeof window === "undefined" ? false : readInstallDismissed()
  );
  const [installed, setInstalled] = useState(() =>
    typeof window === "undefined" ? false : currentInstallationIsStandalone()
  );
  const [installPending, setInstallPending] = useState(false);
  const [installError, setInstallError] = useState<string>();
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    let installingWorker: ServiceWorker | null = null;
    const refreshConnection = () => {
      void probeConnection().then((available) => {
        if (active) setOnline(available);
      });
    };
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (active) setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const confirmInstalled = () => {
      if (!active) return;
      setInstalled(true);
      setInstallPrompt(undefined);
      setInstallError(undefined);
    };
    const inspectInstallingWorker = () => {
      if (!active || !installingWorker || installingWorker.state !== "installed") return;
      if (serviceWorkerUpdateIsReady({
        hadController: navigator.serviceWorker.controller !== null,
        replacementInstalled: true,
      })) setUpdateReady(true);
    };
    const inspectRegistration = () => {
      if (!registration) return;
      installingWorker?.removeEventListener("statechange", inspectInstallingWorker);
      installingWorker = registration.installing;
      installingWorker?.addEventListener("statechange", inspectInstallingWorker);
    };

    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", confirmInstalled);
    window.addEventListener("online", refreshConnection);
    window.addEventListener("offline", refreshConnection);
    refreshConnection();

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((nextRegistration) => {
          if (!active) return;
          registration = nextRegistration;
          if (serviceWorkerUpdateIsReady({
            hadController: navigator.serviceWorker.controller !== null,
            replacementInstalled: registration.waiting !== null,
          })) setUpdateReady(true);
          registration.addEventListener("updatefound", inspectRegistration);
          inspectRegistration();
        })
        .catch(() => {
          // Public browsing continues normally when service workers are blocked.
        });
    }

    return () => {
      active = false;
      installingWorker?.removeEventListener("statechange", inspectInstallingWorker);
      registration?.removeEventListener("updatefound", inspectRegistration);
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", confirmInstalled);
      window.removeEventListener("online", refreshConnection);
      window.removeEventListener("offline", refreshConnection);
    };
  }, []);

  const offerInstall = installOfferIsVisible({
    dismissed: installDismissed,
    installed,
    promptCaptured: installPrompt !== undefined,
  });

  const dismissInstall = () => {
    setInstallDismissed(true);
    rememberInstallDismissed();
  };

  const requestInstall = async () => {
    if (!installPrompt || installPending) return;
    setInstallPending(true);
    setInstallError(undefined);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(undefined);
      if (choice.outcome === "dismissed") dismissInstall();
    } catch {
      setInstallPrompt(undefined);
      setInstallError("The browser could not open its install prompt. You can install later from the browser menu.");
    } finally {
      setInstallPending(false);
    }
  };

  if (online && !offerInstall && !updateReady && !installError) return null;

  return (
    <div className="pwa-status-stack">
      {!online ? (
        <div className="offline-indicator" role="status">
          Offline · public routes remain readable; account writes will wait for a confirmed connection.
        </div>
      ) : null}
      {updateReady ? (
        <section aria-labelledby="pwa-update-title" className="pwa-notice pwa-update-notice">
          <div>
            <strong id="pwa-update-title">App update ready</strong>
            <span>Your saved workout drafts remain in device storage. Reload when you are ready.</span>
          </div>
          <button onClick={() => window.location.reload()} type="button">Reload</button>
          <button aria-label="Dismiss update notice" className="pwa-notice-dismiss" onClick={() => setUpdateReady(false)} type="button">Later</button>
        </section>
      ) : null}
      {offerInstall ? (
        <section aria-labelledby="pwa-install-title" className="pwa-notice pwa-install-notice">
          <div>
            <strong id="pwa-install-title">Install My Workout Pal</strong>
            <span>Open the public guide in its own window. Account saves still require a connection.</span>
          </div>
          <button disabled={installPending} onClick={() => void requestInstall()} type="button">
            {installPending ? "Opening…" : "Install"}
          </button>
          <button aria-label="Dismiss install offer" className="pwa-notice-dismiss" onClick={dismissInstall} type="button">Not now</button>
        </section>
      ) : null}
      {installError ? <div className="pwa-install-error" role="status">{installError}</div> : null}
    </div>
  );
}
