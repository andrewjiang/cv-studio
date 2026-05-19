"use client";

import { useEffect } from "react";

export function ResumeAutoPrintBridge() {
  useEffect(() => {
    let secondFrame: number | null = null;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        window.print();
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);

      if (secondFrame !== null) {
        window.cancelAnimationFrame(secondFrame);
      }
    };
  }, []);

  return null;
}
