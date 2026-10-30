"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";


// The imported shader/component is a byte-identical copy of the approved wave.
const Wave = dynamic(() => import("./Wave"), { ssr: false });
const MotionContext = createContext({ paused: true });

export function PrismaticMotionProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPaused(media.matches);
    const change = () => setPaused(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return <MotionContext.Provider value={{ paused }}>{children}</MotionContext.Provider>;
}

export function PrismaticWave({ variant = "hero" }: { variant?: string }) {
  const { paused } = useContext(MotionContext);
  return <Wave paused={paused} variant={variant} />;
}
