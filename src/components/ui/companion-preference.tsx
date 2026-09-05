"use client";

import { useSyncExternalStore } from "react";

type CompanionChoice = "pip" | "mica" | "off";
const key = "mwp:companion:v1";
const changeEvent = "mwp-companion-change";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(changeEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(changeEvent, listener);
  };
}
function snapshot(): CompanionChoice {
  try {
    const value = localStorage.getItem(key);
    return value === "mica" || value === "off" ? value : "pip";
  } catch { return "pip"; }
}
export function useCompanionChoice(): CompanionChoice {
  return useSyncExternalStore(subscribe, snapshot, () => "pip");
}
export function CompanionPreference() {
  const choice = useCompanionChoice();
  return <section className="quiet-companion-preference" aria-labelledby="companion-preference-title">
    <h2 id="companion-preference-title">A little company</h2>
    <p>Optional illustrations, saved on this browser. They never change your workout.</p>
    <label htmlFor="companion-choice">Your companion</label>
    <select id="companion-choice" value={choice} onChange={(event) => {
      try { localStorage.setItem(key, event.target.value); } catch { return; }
      window.dispatchEvent(new Event(changeEvent));
    }}>
      <option value="pip">Pip, the stoat</option>
      <option value="mica">Mica, the kingfisher</option>
      <option value="off">Off</option>
    </select>
  </section>;
}
