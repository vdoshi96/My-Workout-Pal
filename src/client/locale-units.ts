"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/** Pounds for the US, Liberia and Myanmar; kilograms everywhere else. The server render assumes pounds. */
export function useLocaleUnitSystem(): "imperial" | "metric" {
  return useSyncExternalStore(subscribe, () => (/^(en-US|en-LR|my)/u.test(navigator.language) ? "imperial" : "metric"), () => "imperial");
}
