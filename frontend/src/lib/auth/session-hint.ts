"use client";

import { useSyncExternalStore } from "react";

export const SESSION_HINT_KEY = "bid4:session";

export const SESSION_HINT_SCRIPT = `try{document.documentElement.dataset.session=localStorage.getItem(${JSON.stringify(
  SESSION_HINT_KEY,
)})==="in"?"in":"out"}catch(e){document.documentElement.dataset.session="out"}`;

export function rememberSession(signedIn: boolean): void {
  const hint = signedIn ? "in" : "out";
  document.documentElement.dataset.session = hint;
  try {
    localStorage.setItem(SESSION_HINT_KEY, hint);
  } catch {
  }
}

export function useWasSignedIn(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => document.documentElement.dataset.session === "in",
    () => false,
  );
}
