"use client";

import { useEffect, useSyncExternalStore } from "react";

function subscribeToConnection(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function PwaRegistration() {
  const online = useSyncExternalStore(
    subscribeToConnection,
    () => window.navigator.onLine,
    () => true,
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }
  }, []);

  return online ? null : (
    <div className="offline-indicator" role="status">
      Offline · public routes remain readable; account writes will wait for a confirmed connection.
    </div>
  );
}
