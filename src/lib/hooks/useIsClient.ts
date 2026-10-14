"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during server rendering and hydration, true after the component has
 * mounted on the client. Use it to gate output that depends on the visitor's
 * clock, timezone, or other browser-only state without hydration mismatches.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
