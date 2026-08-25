"use client";

import { useEffect, useState } from "react";

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

export function PwaRegistration() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let active = true;
    const refreshConnection = () => {
      void probeConnection().then((available) => {
        if (active) setOnline(available);
      });
    };

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }
    window.addEventListener("online", refreshConnection);
    window.addEventListener("offline", refreshConnection);
    refreshConnection();

    return () => {
      active = false;
      window.removeEventListener("online", refreshConnection);
      window.removeEventListener("offline", refreshConnection);
    };
  }, []);

  return online ? null : (
    <div className="offline-indicator" role="status">
      Offline · public routes remain readable; account writes will wait for a confirmed connection.
    </div>
  );
}
