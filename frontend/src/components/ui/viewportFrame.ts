"use client";

import { useEffect, useState } from "react";

export interface ViewportFrame {
  top: number;
  height: number;
}

export function useViewportFrame(open: boolean): ViewportFrame | null {
  const [frame, setFrame] = useState<ViewportFrame | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!open || !viewport) return;

    const sync = () => {
      setFrame({ top: viewport.offsetTop, height: viewport.height });
    };

    const first = window.requestAnimationFrame(sync);
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);

    return () => {
      window.cancelAnimationFrame(first);
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, [open]);

  return open ? frame : null;
}
